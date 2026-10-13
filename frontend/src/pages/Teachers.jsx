import { useMemo, useState } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useStore } from '../store.jsx';
import Modal from '../components/Modal.jsx';
import Field from '../components/Field.jsx';
import PageHead from '../components/PageHead.jsx';
import Icon from '../components/Icon.jsx';
import { fmtDate } from '../utils.js';
import { getTeachers, createTeacher, updateTeacher, deleteTeacher } from '../services/api.js';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import ConfirmModal from '../components/ConfirmModal.jsx';

const EMPTY = { last_name: '', first_name: '', start_date: '', phone: '' };
const PAGE_SIZE = 10;


const errMsg = (err) =>
  err?.response?.data?.message || err?.message || 'حدث خطأ غير متوقع';

const schema = Yup.object({
  last_name: Yup.string().trim().min(2, 'اللقب قصير جدًا').max(100, 'اللقب طويل جدًا').required('اللقب مطلوب'),
  first_name: Yup.string().trim().min(2, 'الاسم قصير جدًا').max(100, 'الاسم طويل جدًا').required('الاسم مطلوب'),
  start_date: Yup.date().typeError('تاريخ غير صالح').required('تاريخ البدء مطلوب'),
  phone: Yup.string()
    .matches(/^[0-9+ ]{8,15}$/, 'أرقام فقط (8 إلى 15 خانة)')
    .required('رقم الهاتف مطلوب'),
});

function TeacherForm({ initial, onSubmit, onCancel, isSubmitting }) {
  const formik = useFormik({
    initialValues: {
      ...EMPTY,
      ...initial,
      start_date: initial.start_date ? String(initial.start_date).slice(0, 10) : '',
    },
    validationSchema: schema,
     onSubmit: (values) => {
      onSubmit({ id: initial.id, payload: values });
    },
  });

  const err = (k) =>
    formik.touched[k] && formik.errors[k] ? <small className="error">{formik.errors[k]}</small> : null;

  return (
    <form onSubmit={formik.handleSubmit} className="form-grid" noValidate>
      <Field label="اللقب">
        <input {...formik.getFieldProps('last_name')} autoFocus />
        {err('last_name')}
      </Field>
      <Field label="الاسم">
        <input {...formik.getFieldProps('first_name')} />
        {err('first_name')}
      </Field>
      <Field label="تاريخ البدء">
        <input type="date" {...formik.getFieldProps('start_date')} />
        {err('start_date')}
      </Field>
      <Field label="رقم الهاتف">
        <input type="tel" dir="ltr" className="text-start" {...formik.getFieldProps('phone')} />
        {err('phone')}
      </Field>
      <div className="form-actions">
        <button type="button" className="btn" onClick={onCancel}>إلغاء</button>
        <button type="submit" className="btn primary" disabled={isSubmitting}>حفظ</button>
      </div>
    </form>
  );
}

export default function Teachers() {
  const queryClient = useQueryClient();
  const [toDelete, setToDelete] = useState(null);
  const [page, setPage] = useState(1);

  const [q, setQ] = useState('');
  const [editing, setEditing] = useState(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['teachers'] });


  const {data : teachers = [] } = useQuery({
    queryKey:["teachers"],
    queryFn: async () => (await getTeachers()).data
  })

  const saveMutation = useMutation({
      mutationFn: ({ id, payload }) =>
        id ? updateTeacher(id, payload) : createTeacher(payload),
      onSuccess: () => {
        setEditing(null);
        invalidate();
      },
      onError: (err) => window.alert(errMsg(err)),
    });

      const deleteMutation = useMutation({
        mutationFn: (id) => deleteTeacher(id),
        onSuccess: () => {
          setToDelete(null);
          invalidate();
        },
        onError: (err) => window.alert(errMsg(err)),
      });


  const list = useMemo(
    () =>
      teachers.filter(
        (t) => !q || [t.last_name, t.first_name, t.phone].join(' ').includes(q.trim())
      ),
    [teachers, q]
  );


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
        title="المعلمون"
        subtitle="قائمة المعلمين وتاريخ التحاقهم بالجمعية."
        action={
          <button className="btn primary" onClick={() => setEditing({ ...EMPTY })}>
            <Icon name="plus" /> إضافة معلم
          </button>
        }
      />

      <div className="toolbar">
        <div className="search">
          <Icon name="search" />
          <input placeholder="ابحث بالاسم أو الهاتف" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>اللقب</th>
              <th>الاسم</th>
              <th>تاريخ البدء</th>
              <th>رقم الهاتف</th>
              <th className="actions-col"><span className="sr">إجراءات</span></th>
            </tr>
          </thead>
          <tbody>
            {pagedList.map((t) => (
              <tr key={t.id}>
                <td className="strong">{t.last_name}</td>
                <td>{t.first_name}</td>
                <td><span className="num">{fmtDate(t.start_date)}</span></td>
                <td><span className="num">{t.phone}</span></td>
                <td className="actions">
                  <button className="icon-btn" onClick={() => setEditing(t)} aria-label={`تعديل ${t.first_name}`}><Icon name="edit" /></button>
                  <button className="icon-btn danger" onClick={() => setToDelete(t)} aria-label={`حذف ${t.first_name}`}><Icon name="trash" /></button>
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr><td colSpan="5" className="empty">
                {teachers.length ? 'لا توجد نتائج مطابقة للبحث.' : 'لم تتم إضافة أي معلم بعد. اضغط «إضافة معلم» للبدء.'}
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
                title="حذف المعلم"
                message={`هل تريد حذف "${toDelete.first_name} ${toDelete.last_name}"؟`}
                confirmText="حذف"
                danger
                onClose={() => setToDelete(null)}
                onConfirm={() => deleteMutation.mutate(toDelete.id)}
              />
            )}

      {editing && (
        <Modal title={editing.id ? 'تعديل بيانات المعلم' : 'إضافة معلم'} onClose={() => setEditing(null)}>
          <TeacherForm initial={editing}
           isSubmitting={saveMutation.isPending}
          onSubmit={(vars) => saveMutation.mutate(vars)}
           onCancel={() => setEditing(null)} />
        </Modal>
      )}
    </>
  );
}