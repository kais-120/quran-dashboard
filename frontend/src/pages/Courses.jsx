// src/pages/Courses.jsx
import { useEffect, useMemo, useState } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import Modal from '../components/Modal.jsx';
import Field from '../components/Field.jsx';
import PageHead from '../components/PageHead.jsx';
import Icon from '../components/Icon.jsx';
import { fmtDate } from '../utils.js';
import {
  getCourses,
  createCourse,
  updateCourse,
  deleteCourse,
  getStudentsWithoutActiveCourse,
} from '../services/api.js';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import ConfirmModal from '../components/ConfirmModal.jsx';

const EMPTY = { name: '', start_date: '', end_date: '', student_ids: [] };
const PAGE_SIZE = 10;

const same = (a, b) => String(a ?? '') === String(b ?? '');

const toInput = (d) => (d ? String(d).slice(0, 10) : '');

const dayName = (d) => {
  if (!d) return '';
  const date = new Date(`${toInput(d)}T00:00:00`);
  if (isNaN(date)) return '';
  return date.toLocaleDateString('ar-TN', { weekday: 'long' });
};

const studentName = (s) => (s?.name || '').trim();

const errMsg = (err) =>
  err?.response?.data?.message ||
  err?.response?.data?.error ||
  err?.message ||
  'حدث خطأ غير متوقع';

const schema = Yup.object({
  name: Yup.string().trim().min(2, 'الاسم قصير جدًا').max(150, 'الاسم طويل جدًا').required('اسم الدورة مطلوب'),
  start_date: Yup.date().typeError('تاريخ غير صالح').required('تاريخ البدء مطلوب'),
  end_date: Yup.date()
    .typeError('تاريخ غير صالح')
    .min(Yup.ref('start_date'), 'تاريخ النهاية يجب أن يكون بعد تاريخ البدء')
    .required('تاريخ النهاية مطلوب'),
  student_ids: Yup.array().of(Yup.number()),
});

const checkboxStyle = { width: 'auto', padding: 0, margin: 0, flex: 'none', cursor: 'pointer' };

function CourseForm({ initial, students, onSubmit, onCancel, isSubmitting }) {
  const [sq, setSq] = useState('');

  const formik = useFormik({
    initialValues: {
      ...EMPTY,
      ...initial,
      start_date: toInput(initial.start_date),
      end_date: toInput(initial.end_date),
      student_ids: initial.student_ids || (initial.students || []).map((s) => s.id),
    },
    validationSchema: schema,
    onSubmit: (values) => {
      onSubmit({ id: initial.id, payload: values });
    },
  });

  const err = (k) =>
    formik.touched[k] && formik.errors[k] ? <small className="error">{formik.errors[k]}</small> : null;

  const selected = formik.values.student_ids;

  const toggle = (id) =>
    formik.setFieldValue(
      'student_ids',
      selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]
    );

  const visible = useMemo(() => {
    const term = sq.trim();
    return students.filter((s) => !term || studentName(s).includes(term));
  }, [students, sq]);

  const selectAllVisible = () =>
    formik.setFieldValue('student_ids', [...new Set([...selected, ...visible.map((s) => s.id)])]);

  const clearAll = () => formik.setFieldValue('student_ids', []);

  return (
    <form onSubmit={formik.handleSubmit} className="form-grid" noValidate>
      <Field label="اسم الدورة">
        <input {...formik.getFieldProps('name')} autoFocus />
        {err('name')}
      </Field>
      <Field label="تاريخ البدء">
        <input type="date" {...formik.getFieldProps('start_date')} />
        {formik.values.start_date && <small>{dayName(formik.values.start_date)}</small>}
        {err('start_date')}
      </Field>
      <Field label="تاريخ النهاية">
        <input type="date" {...formik.getFieldProps('end_date')} />
        {formik.values.end_date && <small>{dayName(formik.values.end_date)}</small>}
        {err('end_date')}
      </Field>

      <Field label={`الطلبة المشاركون (${selected.length} / ${students.length})`}>
        <input
          placeholder="ابحث عن طالب"
          value={sq}
          onChange={(e) => setSq(e.target.value)}
        />
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button type="button" className="btn" onClick={selectAllVisible} disabled={visible.length === 0}>
            تحديد الكل ({visible.length})
          </button>
          <button type="button" className="btn" onClick={clearAll} disabled={selected.length === 0}>
            مسح التحديد
          </button>
        </div>
        <div
          style={{
            maxHeight: 240,
            overflowY: 'auto',
            marginTop: 8,
            border: '1px solid #ddd',
            borderRadius: 8,
            padding: '4px 8px',
          }}
        >
          {visible.map((s) => (
            <label
              key={s.id}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', cursor: 'pointer' }}
            >
              <input
                type="checkbox"
                style={checkboxStyle}
                checked={selected.includes(s.id)}
                onChange={() => toggle(s.id)}
              />
              <span>{studentName(s)}</span>
            </label>
          ))}
          {visible.length === 0 && <small>لا يوجد طلبة.</small>}
        </div>
      </Field>

      <div className="form-actions">
        <button type="button" className="btn" onClick={onCancel}>إلغاء</button>
        <button type="submit" className="btn primary" disabled={isSubmitting}>حفظ</button>
      </div>
    </form>
  );
}

export default function Courses() {
  const queryClient = useQueryClient();
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [toAdd, setToAdd] = useState('');
  const [vq, setVq] = useState('');
  const [toDelete, setToDelete] = useState(null);
  const [page, setPage] = useState(1);

  // FIX: invalidate the keys this page actually uses
  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['courses'] }),
      queryClient.invalidateQueries({ queryKey: ['studentsWithoutActiveCourse'] }),
    ]);

  const { data: courses = [] } = useQuery({
    queryKey: ['courses'],
    queryFn: async () => (await getCourses()).data,
  });

  const { data: students = [] } = useQuery({
    queryKey: ['studentsWithoutActiveCourse'],
    queryFn: async () => (await getStudentsWithoutActiveCourse()).data.students,
  });

  const saveMutation = useMutation({
    mutationFn: ({ id, payload }) =>
      id ? updateCourse(id, payload) : createCourse(payload),
    onSuccess: async () => {
      await invalidate();
      setEditing(null);
    },
    onError: (err) => window.alert(errMsg(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteCourse(id),
    onSuccess: async () => {
      await invalidate();
      setToDelete(null);
    },
    onError: (err) => window.alert(errMsg(err)),
  });

  const studentsMutation = useMutation({
    mutationFn: ({ course, student_ids }) =>
      updateCourse(course.id, {
        name: course.name,
        start_date: toInput(course.start_date),
        end_date: toInput(course.end_date),
        student_ids,
      }),
    onSuccess: () => invalidate(),
    onError: (err) => window.alert(errMsg(err)),
  });

  const busy = studentsMutation.isPending;

  const list = useMemo(
    () => courses.filter((c) => !q || c.name.includes(q.trim())),
    [courses, q]
  );

  // ---- students modal ----
  const viewedCourse = viewing ? courses.find((c) => same(c.id, viewing)) : null;
  const members = useMemo(() => viewedCourse?.students || [], [viewedCourse]);

  const available = useMemo(() => {
    const ids = new Set(members.map((s) => String(s.id)));
    return students.filter((s) => !ids.has(String(s.id)));
  }, [students, members]);

  const filteredMembers = useMemo(() => {
    const term = vq.trim();
    return members.filter((s) => !term || studentName(s).includes(term));
  }, [members, vq]);

  const closeView = () => {
    setViewing(null);
    setToAdd('');
    setVq('');
  };

  const saveStudents = (ids) =>
    studentsMutation.mutateAsync({ course: viewedCourse, student_ids: ids });

  const addStudent = async () => {
    if (!toAdd || !viewedCourse) return;
    await saveStudents([...members.map((s) => s.id), Number(toAdd)]);
    setToAdd('');
  };

  const removeStudent = async (s) => {
    if (!window.confirm(`إزالة الطالب «${studentName(s)}» من الدورة؟ (لن يتم حذفه)`)) return;
    await saveStudents(members.filter((m) => !same(m.id, s.id)).map((m) => m.id));
  };

  // students offered in the edit form: available + the course's current members
  const formStudents = useMemo(() => {
    const map = new Map(students.map((s) => [s.id, s]));
    (editing?.students || []).forEach((s) => map.set(s.id, s));
    return [...map.values()];
  }, [students, editing]);

  const pagination = useMemo(() => {
    const total = list.length;
    return { total, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
  }, [list]);

  // Keep page valid (e.g. after deleting the last item on the last page)
  useEffect(() => {
    if (page > pagination.totalPages) setPage(pagination.totalPages);
  }, [page, pagination.totalPages]);

  const pagedList = useMemo(
    () => list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [list, page]
  );

  return (
    <>
      <PageHead
        title="الدورات"
        subtitle="قائمة الدورات مع تاريخ البدء والنهاية والطلبة المشاركين."
        action={
          <button className="btn primary" onClick={() => setEditing({ ...EMPTY })}>
            <Icon name="plus" /> إضافة دورة
          </button>
        }
      />

      <div className="toolbar">
        <div className="search">
          <Icon name="search" />
          <input placeholder="ابحث باسم الدورة" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>اسم الدورة</th>
              <th>تاريخ البدء</th>
              <th>يوم البدء</th>
              <th>تاريخ النهاية</th>
              <th>يوم النهاية</th>
              <th>عدد الطلبة</th>
              <th>الطلبة</th>
              <th className="actions-col"><span className="sr">إجراءات</span></th>
            </tr>
          </thead>
          <tbody>
            {pagedList.map((c) => (
              <tr key={c.id}>
                <td className="strong">{c.name}</td>
                <td><span className="num">{fmtDate(c.start_date)}</span></td>
                <td>{dayName(c.start_date)}</td>
                <td><span className="num">{fmtDate(c.end_date)}</span></td>
                <td>{dayName(c.end_date)}</td>
                <td><span className="tag">{(c.students || []).length}</span></td>
                <td>
                  <button className="btn" onClick={() => setViewing(c.id)}>
                    <Icon name="search" /> عرض الطلبة
                  </button>
                </td>
                <td className="actions">
                  <button className="icon-btn" onClick={() => setEditing(c)} aria-label={`تعديل ${c.name}`}><Icon name="edit" /></button>
                  <button className="icon-btn danger" onClick={() => setToDelete(c)} aria-label={`حذف ${c.name}`}><Icon name="trash" /></button>
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr><td colSpan="8" className="empty">
                {courses.length ? 'لا توجد نتائج مطابقة للبحث.' : 'لم تتم إضافة أي دورة بعد. اضغط «إضافة دورة» للبدء.'}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

       {pagination.totalPages > 1 && (
        <div className="pagination">
          <button
            className="btn"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            السابق
          </button>
          <span className="num">
            {page} / {pagination.totalPages} ({pagination.total})
          </span>
          <button
            className="btn"
            onClick={() =>
              setPage((p) => Math.min(pagination.totalPages, p + 1))
            }
            disabled={page >= pagination.totalPages}
          >
            التالي
          </button>
        </div>
      )}

      {toDelete && (
        <ConfirmModal
          title="حذف الدورة"
          message={`هل تريد حذف "${toDelete.name}"؟`}
          confirmText="حذف"
          danger
          onClose={() => setToDelete(null)}
          onConfirm={() => deleteMutation.mutate(toDelete.id)}
        />
      )}

      {editing && (
        <Modal title={editing.id ? 'تعديل الدورة' : 'إضافة دورة'} onClose={() => setEditing(null)}>
          <CourseForm
            initial={editing}
            students={formStudents}
            isSubmitting={saveMutation.isPending}
            onSubmit={(vars) => saveMutation.mutate(vars)}
            onCancel={() => setEditing(null)}
          />
        </Modal>
      )}

      {viewedCourse && (
        <Modal wide title={`طلبة الدورة «${viewedCourse.name}»`} onClose={closeView}>
          <div className="toolbar">
            <select value={toAdd} onChange={(e) => setToAdd(e.target.value)} aria-label="اختر طالبًا">
              <option value="">اختر طالبًا لإضافته</option>
              {available.map((s) => (
                <option key={s.id} value={s.id}>{studentName(s)}</option>
              ))}
            </select>
            <button type="button" className="btn primary" onClick={addStudent} disabled={!toAdd || busy}>
              <Icon name="plus" /> إضافة
            </button>
            <div className="search">
              <Icon name="search" />
              <input placeholder="ابحث في طلبة الدورة" value={vq} onChange={(e) => setVq(e.target.value)} />
            </div>
          </div>

          <div className="table-wrap" style={{ maxHeight: 420, overflowY: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>الاسم واللقب</th>
                  <th>اسم الولي</th>
                  <th>هاتف الولي</th>
                  <th className="actions-col"><span className="sr">إجراءات</span></th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.map((s, i) => (
                  <tr key={s.id}>
                    <td><span className="num">{i + 1}</span></td>
                    <td className="strong">{studentName(s)}</td>
                    <td>{s.father_name || '—'}</td>
                    <td><span className="num">{s.father_phone || '—'}</span></td>
                    <td className="actions">
                      <button
                        className="icon-btn danger"
                        onClick={() => removeStudent(s)}
                        disabled={busy}
                        aria-label={`إزالة ${studentName(s)}`}
                      >
                        <Icon name="trash" />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredMembers.length === 0 && (
                  <tr><td colSpan="5" className="empty">
                    {members.length ? 'لا توجد نتائج مطابقة.' : 'لا يوجد طلبة في هذه الدورة.'}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="form-actions">
            <button type="button" className="btn" onClick={closeView}>إغلاق</button>
          </div>
        </Modal>
      )}
    </>
  );
}