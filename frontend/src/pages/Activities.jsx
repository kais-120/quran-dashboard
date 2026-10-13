// src/pages/Activities.jsx
import { useMemo, useState } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Modal from '../components/Modal.jsx';
import Field from '../components/Field.jsx';
import PageHead from '../components/PageHead.jsx';
import Icon from '../components/Icon.jsx';
import { fmtDate } from '../utils.js';
import {
  getActivities,
  createActivity,
  updateActivity,
  deleteActivity,
} from '../services/api.js';
import { useEffect } from 'react';
import ConfirmModal from '../components/ConfirmModal.jsx';

const EMPTY = { name: '', start_date: '', end_date: '' };
const QUERY_KEY = ['activities'];
const PAGE_SIZE = 10;


const toInput = (d) => (d ? String(d).slice(0, 10) : '');

// Arabic day name from a YYYY-MM-DD date
const dayName = (d) => {
  if (!d) return '';
  const date = new Date(`${toInput(d)}T00:00:00`);
  if (isNaN(date)) return '';
  return date.toLocaleDateString('ar-TN', { weekday: 'long' });
};

const schema = Yup.object({
  name: Yup.string().trim().min(2, 'الاسم قصير جدًا').max(150, 'الاسم طويل جدًا').required('اسم النشاط مطلوب'),
  start_date: Yup.date().typeError('تاريخ غير صالح').required('تاريخ البدء مطلوب'),
  end_date: Yup.date()
    .typeError('تاريخ غير صالح')
    .min(Yup.ref('start_date'), 'تاريخ النهاية يجب أن يكون بعد تاريخ البدء')
    .required('تاريخ النهاية مطلوب'),
});

function ActivityForm({ initial, onSubmit, onCancel }) {
  const formik = useFormik({
    initialValues: {
      ...EMPTY,
      ...initial,
      start_date: toInput(initial.start_date),
      end_date: toInput(initial.end_date),
    },
    validationSchema: schema,
    onSubmit,
  });

  const err = (k) =>
    formik.touched[k] && formik.errors[k] ? <small className="error">{formik.errors[k]}</small> : null;

  return (
    <form onSubmit={formik.handleSubmit} className="form-grid" noValidate>
      <Field label="اسم النشاط">
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
      <div className="form-actions">
        <button type="button" className="btn" onClick={onCancel}>إلغاء</button>
        <button type="submit" className="btn primary" disabled={formik.isSubmitting}>حفظ</button>
      </div>
    </form>
  );
}

export default function Activities() {
  const queryClient = useQueryClient();
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState(null);
  const [page, setPage] = useState(1);
  const [toDelete, setToDelete] = useState(null);



  const {
    data: activities = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => (await getActivities()).data,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: QUERY_KEY });

  const saveMutation = useMutation({
    mutationFn: ({ id, ...rest }) => (id ? updateActivity(id, rest) : createActivity(rest)),
    onSuccess: () => {
      invalidate();
      setEditing(null);
    },
    onError: (e) => console.error('error', e),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteActivity(id),
    onSuccess: () => {
      setToDelete(null)
      invalidate();
    },
    onError: (e) => console.error('error', e),
  });

  const list = useMemo(
    () => activities.filter((a) => !q || a.name.includes(q.trim())),
    [activities, q]
  );

  // Returning the promise lets Formik manage isSubmitting automatically
  const save = async (values) => {
    try {
      await saveMutation.mutateAsync(values);
    } catch {
      // handled in onError
    }
  };

  const del = (a) => {
    if (!window.confirm(`حذف النشاط «${a.name}»؟`)) return;
    deleteMutation.mutate(a.id);
  };

  const emptyMessage = isLoading
    ? 'جارٍ التحميل...'
    : isError
    ? 'تعذر تحميل النشاطات.'
    : activities.length
    ? 'لا توجد نتائج مطابقة للبحث.'
    : 'لم تتم إضافة أي نشاط بعد. اضغط «إضافة نشاط» للبدء.';

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
        title="النشاطات"
        subtitle="قائمة النشاطات مع تاريخ البدء والنهاية."
        action={
          <button className="btn primary" onClick={() => setEditing({ ...EMPTY })}>
            <Icon name="plus" /> إضافة نشاط
          </button>
        }
      />

      <div className="toolbar">
        <div className="search">
          <Icon name="search" />
          <input placeholder="ابحث باسم النشاط" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>اسم النشاط</th>
              <th>تاريخ البدء</th>
              <th>يوم البدء</th>
              <th>تاريخ النهاية</th>
              <th>يوم النهاية</th>
              <th className="actions-col"><span className="sr">إجراءات</span></th>
            </tr>
          </thead>
          <tbody>
            {pagedList.map((a) => (
              <tr key={a.id}>
                <td className="strong">{a.name}</td>
                <td><span className="num">{fmtDate(a.start_date)}</span></td>
                <td>{dayName(a.start_date)}</td>
                <td><span className="num">{fmtDate(a.end_date)}</span></td>
                <td>{dayName(a.end_date)}</td>
                <td className="actions">
                  <button className="icon-btn" onClick={() => setEditing(a)} aria-label={`تعديل ${a.name}`}><Icon name="edit" /></button>
                  <button
                    className="icon-btn danger"
                    onClick={() => setToDelete(a)}
                    disabled={deleteMutation.isPending}
                    aria-label={`حذف ${a.name}`}
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
        <Modal title={editing.id ? 'تعديل النشاط' : 'إضافة نشاط'} onClose={() => setEditing(null)}>
          <ActivityForm initial={editing} onSubmit={save} onCancel={() => setEditing(null)} />
        </Modal>
      )}
    </>
  );
}