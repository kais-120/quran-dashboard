import { useMemo, useState } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import Modal from '../components/Modal.jsx';
import Field from '../components/Field.jsx';
import PageHead from '../components/PageHead.jsx';
import Icon from '../components/Icon.jsx';
import {
  addStudentToGroup,
  createGroup,
  deleteGroup,
  getGroups,
  getStudentsWithoutGroup,
  getTeachers,
  removeStudentFromGroup,
  updateGroup,
} from '../services/api.js';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import ConfirmModal from '../components/ConfirmModal.jsx';
import { useEffect } from 'react';

const EMPTY = { label: '', head_teacher_id: '' };
const same = (a, b) => String(a ?? '') === String(b ?? '');
const errMsg = (err) => err?.response?.data?.message || err?.message || 'حدث خطأ غير متوقع';

const schema = Yup.object({
  label: Yup.string().trim().min(2, 'اسم الفوج قصير جدًا').max(100, 'اسم الفوج طويل جدًا').required('اسم الفوج مطلوب'),
  head_teacher_id: Yup.string().nullable(),
});
const PAGE_SIZE = 10;


function GroupForm({ initial, teachers, onSubmit, onCancel }) {
  const formik = useFormik({
    initialValues: {
      id: initial.id,
      label: initial.label ?? '',
      head_teacher_id: initial.head_teacher_id ?? '',
    },
    validationSchema: schema,
    onSubmit,
  });

  const err = (k) =>
    formik.touched[k] && formik.errors[k] ? <small className="error">{formik.errors[k]}</small> : null;

  return (
    <form onSubmit={formik.handleSubmit} className="form-grid" noValidate>
      <Field label="اسم الفوج" wide>
        <input {...formik.getFieldProps('label')} maxLength={100} autoFocus />
        {err('label')}
      </Field>
      <Field label="المعلم المسؤول" wide>
        <select {...formik.getFieldProps('head_teacher_id')}>
          <option value="">بدون معلم</option>
          {teachers.map((t) => (
            <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>
          ))}
        </select>
        {err('head_teacher_id')}
      </Field>
      <div className="form-actions">
        <button type="button" className="btn" onClick={onCancel}>إلغاء</button>
        <button type="submit" className="btn primary" disabled={formik.isSubmitting}>حفظ</button>
      </div>
    </form>
  );
}

export default function Groups() {
  const queryClient = useQueryClient();
  const [q, setQ] = useState('');
  const [fTeacher, setFTeacher] = useState('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null); // group id only
  const [studentToAdd, setStudentToAdd] = useState('');
  const [toDelete, setToDelete] = useState(null);
  const [toDeleteStudent, setToDeleteStudent] = useState(null);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['groups'] });
    queryClient.invalidateQueries({ queryKey: ['studentsWithoutGroup'] });
  };

  // ---------- Queries ----------
  const { data: groups = [] } = useQuery({
    queryKey: ['groups'],
    queryFn: async () => (await getGroups()).data,
  });

  const { data: teachers = [] } = useQuery({
    queryKey: ['teachers'],
    queryFn: async () => (await getTeachers()).data,
  });

  const { data: freeStudents = [] } = useQuery({
    queryKey: ['studentsWithoutGroup'],
    queryFn: async () => (await getStudentsWithoutGroup()).data,
  });

  // ---------- Mutations ----------
  const saveMutation = useMutation({
    mutationFn: ({ id, payload }) => (id ? updateGroup(id, payload) : createGroup(payload)),
    onSuccess: () => {
      setEditing(null);
      invalidate();
    },
    onError: (err) => window.alert(errMsg(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteGroup(id),
    onSuccess: () => {
      setToDelete(null);
      invalidate();
    },
    onError: (err) => window.alert(errMsg(err)),
  });

  const addStudentMutation = useMutation({
    mutationFn: (data) => addStudentToGroup(data),
    onSuccess: () => {
      setStudentToAdd('');
      invalidate();
    },
    onError: (err) => window.alert(errMsg(err)),
  });

  const removeStudentMutation = useMutation({
    mutationFn: (id) => removeStudentFromGroup(id),
    onSuccess: () => {
      setToDeleteStudent(null);
      invalidate();
    },
    onError: (err) => window.alert(errMsg(err)),
  });

  // ---------- Derived ----------
  const teacherName = (g) =>
    g.headTeacher ? `${g.headTeacher.first_name} ${g.headTeacher.last_name}` : '—';

  const list = useMemo(
    () =>
      groups.filter(
        (g) =>
          (!fTeacher || same(g.head_teacher_id, fTeacher)) &&
          (!q || (g.label || '').includes(q.trim()))
      ),
    [groups, q, fTeacher]
  );

  const viewedGroup = viewing ? groups.find((g) => same(g.id, viewing)) : null;
  const viewedStudents = viewedGroup?.studentGroup || [];

  // ---------- Handlers ----------
  const save = (values, { setSubmitting }) => {
    const { id, label, head_teacher_id } = values;
    saveMutation.mutate(
      { id, payload: { label: label.trim(), head_teacher_id: head_teacher_id || null } },
      { onSettled: () => setSubmitting(false) }
    );
  };

  const addStudent = () => {
    if (!studentToAdd || !viewedGroup) return;
    addStudentMutation.mutate({ student_id: studentToAdd, group_id: viewedGroup.id });
  };

  const closeView = () => {
    setViewing(null);
    setStudentToAdd('');
  };

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
        title="الأفواج"
        subtitle="إدارة الأفواج والمعلمين المسؤولين عنها وتلاميذ كل فوج."
        action={
          <button className="btn primary" onClick={() => setEditing({ ...EMPTY })}>
            <Icon name="plus" /> إضافة فوج
          </button>
        }
      />

      <div className="toolbar">
        <div className="search">
          <Icon name="search" />
          <input placeholder="ابحث باسم الفوج" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select value={fTeacher} onChange={(e) => setFTeacher(e.target.value)} aria-label="تصفية حسب المعلم">
          <option value="">كل المعلمين</option>
          {teachers.map((t) => (
            <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>
          ))}
        </select>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>اسم الفوج</th>
              <th>المعلم المسؤول</th>
              <th>عدد التلاميذ</th>
              <th>التلاميذ</th>
              <th className="actions-col"><span className="sr">إجراءات</span></th>
            </tr>
          </thead>
          <tbody>
            {pagedList.map((g) => (
              <tr key={g.id}>
                <td className="strong">{g.label}</td>
                <td>{teacherName(g)}</td>
                <td><span className="tag">{g.studentGroup?.length || 0}</span></td>
                <td>
                  <button className="btn" onClick={() => setViewing(g.id)}>
                    <Icon name="search" /> عرض التلاميذ
                  </button>
                </td>
                <td className="actions">
                  <button
                    className="icon-btn"
                    onClick={() => setEditing({ ...g, head_teacher_id: g.head_teacher_id ?? '' })}
                    aria-label={`تعديل ${g.label}`}
                  >
                    <Icon name="edit" />
                  </button>
                  <button
                    className="icon-btn danger"
                    onClick={() => setToDelete(g)}
                    aria-label={`حذف ${g.label}`}
                  >
                    <Icon name="trash" />
                  </button>
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr><td colSpan="5" className="empty">
                {groups.length ? 'لا توجد نتائج مطابقة. غيّر البحث أو التصفية.' : 'لم تتم إضافة أي فوج بعد. اضغط «إضافة فوج» للبدء.'}
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

      {editing && (
        <Modal title={editing.id ? 'تعديل الفوج' : 'إضافة فوج'} onClose={() => setEditing(null)}>
          <GroupForm
            initial={editing}
            teachers={teachers}
            onSubmit={save}
            onCancel={() => setEditing(null)}
          />
        </Modal>
      )}

      {viewedGroup && (
        <Modal wide title={`تلاميذ الفوج «${viewedGroup.label}»`} onClose={closeView}>
          <div className="toolbar">
            <select value={studentToAdd} onChange={(e) => setStudentToAdd(e.target.value)} aria-label="إضافة تلميذ">
              <option value="">اختر تلميذًا لإضافته</option>
              {freeStudents.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <button
              type="button"
              className="btn primary"
              onClick={addStudent}
              disabled={!studentToAdd || addStudentMutation.isPending}
            >
              <Icon name="plus" /> إضافة
            </button>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>الاسم واللقب</th>
                  <th>اسم الولي</th>
                  <th>هاتف الولي</th>
                  <th className="actions-col"><span className="sr">إجراءات</span></th>
                </tr>
              </thead>
              <tbody>
                {viewedStudents.map((sg) => {
                  const s = sg.students || {};
                  return (
                    <tr key={sg.id}>
                      <td className="strong">{s.name}</td>
                      <td>{s.father_name}</td>
                      <td><span className="num">{s.father_phone}</span></td>
                      <td className="actions">
                        <button
                          className="icon-btn danger"
                          onClick={() => setToDeleteStudent(sg)}
                          disabled={removeStudentMutation.isPending}
                          aria-label={`إزالة ${s.name} من الفوج`}
                        >
                          <Icon name="trash" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {viewedStudents.length === 0 && (
                  <tr><td colSpan="4" className="empty">لا يوجد تلاميذ في هذا الفوج.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="form-actions">
            <button type="button" className="btn" onClick={closeView}>إغلاق</button>
          </div>
        </Modal>
      )}

      {toDelete && (
        <ConfirmModal
          title="حذف الفوج"
          message={`هل تريد حذف الفوج "${toDelete.label}"؟ سيتم فصل تلاميذه عنه (دون حذفهم).`}
          confirmText="حذف"
          danger
          onClose={() => setToDelete(null)}
          onConfirm={() => deleteMutation.mutate(toDelete.id)}
        />
      )}

      {toDeleteStudent && (
        <ConfirmModal
          title="حذف الفوج"
          message={`إزالة التلميذ «${toDeleteStudent?.students?.name}» من هذا الفوج؟`}
          confirmText="حذف"
          danger
          onClose={() => setToDeleteStudent(null)}
          onConfirm={() => removeStudentMutation.mutate(toDeleteStudent.id)}

        />
      )}
    </>
  );
}