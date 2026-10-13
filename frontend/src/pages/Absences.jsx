// src/pages/Absences.jsx
import { useCallback, useMemo, useState } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Modal from '../components/Modal.jsx';
import Field from '../components/Field.jsx';
import PageHead from '../components/PageHead.jsx';
import Icon from '../components/Icon.jsx';
import { fmtDate } from '../utils.js';
import {
  getAbsences,
  createAbsence,
  updateAbsence,
  deleteAbsence,
  getStudents,
} from '../services/api.js';
import { useEffect } from 'react';

const today = () => new Date().toISOString().slice(0, 10);

const EMPTY = { student_id: '', date: today(), justified: false, reason: '' };

const ABSENCES_KEY = ['absences'];
const STUDENTS_KEY = ['students'];
const PAGE_SIZE = 10;


const toInput = (d) => (d ? String(d).slice(0, 10) : '');

const dayName = (d) => {
  if (!d) return '';
  const date = new Date(`${toInput(d)}T00:00:00`);
  if (isNaN(date)) return '';
  return date.toLocaleDateString('ar-TN', { weekday: 'long' });
};

const schema = Yup.object({
  student_id: Yup.number().typeError('اختر الطالب').required('الطالب مطلوب'),
  date: Yup.date().typeError('تاريخ غير صالح').required('تاريخ الغياب مطلوب'),
  justified: Yup.boolean(),
  reason: Yup.string().trim().max(255, 'السبب طويل جدًا'),
});

const checkboxStyle = { width: 'auto', padding: 0, margin: 0, flex: 'none', cursor: 'pointer' };

function AbsenceForm({ initial, students, onSubmit, onCancel }) {
  const formik = useFormik({
    initialValues: {
      ...EMPTY,
      ...initial,
      student_id: initial.student_id ?? '',
      date: toInput(initial.date) || today(),
      justified: !!initial.justified,
      reason: initial.reason || '',
    },
    validationSchema: schema,
    onSubmit,
  });

  const err = (k) =>
    formik.touched[k] && formik.errors[k] ? <small className="error">{formik.errors[k]}</small> : null;

  return (
    <form onSubmit={formik.handleSubmit} className="form-grid" noValidate>
      <Field label="الطالب">
        <select {...formik.getFieldProps('student_id')} autoFocus>
          <option value="">— اختر الطالب —</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        {err('student_id')}
      </Field>
      <Field label="تاريخ الغياب">
        <input type="date" {...formik.getFieldProps('date')} />
        {formik.values.date && <small>{dayName(formik.values.date)}</small>}
        {err('date')}
      </Field>
      <Field label="الحالة">
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input
            type="checkbox"
            style={checkboxStyle}
            checked={formik.values.justified}
            onChange={(e) => formik.setFieldValue('justified', e.target.checked)}
          />
          <span>مبرَّر</span>
        </label>
      </Field>
      <Field label="السبب (اختياري)">
        <input {...formik.getFieldProps('reason')} />
        {err('reason')}
      </Field>
      <div className="form-actions">
        <button type="button" className="btn" onClick={onCancel}>إلغاء</button>
        <button type="submit" className="btn primary" disabled={formik.isSubmitting}>حفظ</button>
      </div>
    </form>
  );
}

export default function Absences() {
  const queryClient = useQueryClient();
  const [q, setQ] = useState('');
  const [date, setDate] = useState('');
  const [editing, setEditing] = useState(null);
  const [page, setPage] = useState(1);
  const [toDelete, setToDelete] = useState(null);



  const {
    data: absences = [],
    isLoading: loadingAbsences,
    isError: errorAbsences,
  } = useQuery({
    queryKey: ABSENCES_KEY,
    queryFn: async () => (await getAbsences()).data,
  });

  const {
    data: students = [],
    isLoading: loadingStudents,
    isError: errorStudents,
  } = useQuery({
    queryKey: STUDENTS_KEY,
    queryFn: async () => (await getStudents()).data,
  });

  const isLoading = loadingAbsences || loadingStudents;
  const isError = errorAbsences || errorStudents;

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ABSENCES_KEY });

  const saveMutation = useMutation({
    mutationFn: ({ id, student, ...rest }) =>
      id ? updateAbsence(id, rest) : createAbsence(rest),
    onSuccess: () => {
      invalidate();
      setEditing(null);
    },
    onError: (e) => console.error('error', e),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteAbsence(id),
    onSuccess: () => 
      {
        setToDelete(null)
        invalidate();
      },
    onError: (e) => console.error('error', e),
  });

  // returns the student NAME (string) for an absence row
  const studentName = useCallback(
    (a) =>
      (
        a.student?.name ||
        students.find((s) => String(s.id) === String(a.student_id))?.name ||
        ''
      ).trim(),
    [students]
  );

  const list = useMemo(
    () =>
      absences.filter((a) => {
        const okName = !q || studentName(a).includes(q.trim());
        const okDate = !date || toInput(a.date) === date;
        return okName && okDate;
      }),
    [absences, q, date, studentName]
  );

  const save = async (values) => {
    try {
      await saveMutation.mutateAsync(values);
    } catch {
      // handled in onError
    }
  };

  const del = (a) => {
    if (!window.confirm(`حذف غياب «${studentName(a)}» بتاريخ ${fmtDate(a.date)}؟`)) return;
    deleteMutation.mutate(a.id);
  };

  const emptyMessage = isLoading
    ? 'جارٍ التحميل...'
    : isError
    ? 'تعذر تحميل الغيابات.'
    : absences.length
    ? 'لا توجد نتائج مطابقة للبحث.'
    : 'لم يتم تسجيل أي غياب بعد. اضغط «تسجيل غياب» للبدء.';

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
        title="الغيابات"
        subtitle="سجل غيابات الطلبة."
        action={
          <button className="btn primary" onClick={() => setEditing({ ...EMPTY, date: today() })}>
            <Icon name="plus" /> تسجيل غياب
          </button>
        }
      />

      <div className="toolbar">
        <div className="search">
          <Icon name="search" />
          <input placeholder="ابحث باسم الطالب" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="تصفية بالتاريخ" />
        {date && (
          <button className="btn" onClick={() => setDate('')}>مسح التاريخ</button>
        )}
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>الطالب</th>
              <th>التاريخ</th>
              <th>اليوم</th>
              <th>الحالة</th>
              <th>السبب</th>
              <th className="actions-col"><span className="sr">إجراءات</span></th>
            </tr>
          </thead>
          <tbody>
            {pagedList.map((a) => (
              <tr key={a.id}>
                <td className="strong">{studentName(a) || '—'}</td>
                <td><span className="num">{fmtDate(a.date)}</span></td>
                <td>{dayName(a.date)}</td>
                <td>{a.justified ? 'مبرَّر' : 'غير مبرَّر'}</td>
                <td>{a.reason || '—'}</td>
                <td className="actions">
                  <button className="icon-btn" onClick={() => setEditing(a)} aria-label="تعديل"><Icon name="edit" /></button>
                  <button
                    className="icon-btn danger"
                    onClick={() => setToDelete(a)}
                    disabled={deleteMutation.isPending}
                    aria-label="حذف"
                  >
                    <Icon name="trash" />
                  </button>
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr><td colSpan="6" className="empty">{emptyMessage}</td></tr>
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
          title="حذف النشاط"
          message={`هل تريد حذف "${toDelete.name}"؟`}
          confirmText="حذف"
          danger
          onClose={() => setToDelete(null)}
          onConfirm={() => deleteMutation.mutate(toDelete.id)}
                    />
                  )}
      

      {editing && (
        <Modal title={editing.id ? 'تعديل الغياب' : 'تسجيل غياب'} onClose={() => setEditing(null)}>
          <AbsenceForm
            initial={editing}
            students={students}
            onSubmit={save}
            onCancel={() => setEditing(null)}
          />
        </Modal>
      )}
    </>
  );
}