// src/pages/Expenses.jsx
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
  getExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
} from '../services/api.js';

const today = () => new Date().toISOString().slice(0, 10);

const EMPTY = { title: '', amount: '', date: today(), note: '' };

const QUERY_KEY = ['expenses'];

const toInput = (d) => (d ? String(d).slice(0, 10) : '');

const dayName = (d) => {
  if (!d) return '';
  const date = new Date(`${toInput(d)}T00:00:00`);
  if (isNaN(date)) return '';
  return date.toLocaleDateString('ar-TN', { weekday: 'long' });
};

const money = (n) => `${Number(n || 0).toFixed(3)} د.ت`;

const schema = Yup.object({
  title: Yup.string().trim().min(2, 'العنوان قصير جدًا').max(150, 'العنوان طويل جدًا').required('عنوان المصروف مطلوب'),
  amount: Yup.number()
    .typeError('مبلغ غير صالح')
    .moreThan(0, 'المبلغ يجب أن يكون أكبر من 0')
    .required('المبلغ مطلوب'),
  date: Yup.date().typeError('تاريخ غير صالح').required('التاريخ مطلوب'),
  note: Yup.string().trim().max(255, 'الملاحظة طويلة جدًا'),
});

function ExpenseForm({ initial, onSubmit, onCancel }) {
  const formik = useFormik({
    initialValues: {
      ...EMPTY,
      ...initial,
      amount: initial.amount ?? '',
      date: toInput(initial.date) || today(),
      note: initial.note || '',
    },
    validationSchema: schema,
    onSubmit,
  });

  const err = (k) =>
    formik.touched[k] && formik.errors[k] ? <small className="error">{formik.errors[k]}</small> : null;

  return (
    <form onSubmit={formik.handleSubmit} className="form-grid" noValidate>
      <Field label="عنوان المصروف">
        <input {...formik.getFieldProps('title')} autoFocus />
        {err('title')}
      </Field>
      <Field label="المبلغ (د.ت)">
        <input type="number" step="0.001" min="0" dir="ltr" className="text-start" {...formik.getFieldProps('amount')} />
        {err('amount')}
      </Field>
      <Field label="التاريخ">
        <input type="date" {...formik.getFieldProps('date')} />
        {formik.values.date && <small>{dayName(formik.values.date)}</small>}
        {err('date')}
      </Field>
      <Field label="ملاحظة (اختياري)">
        <input {...formik.getFieldProps('note')} />
        {err('note')}
      </Field>
      <div className="form-actions">
        <button type="button" className="btn" onClick={onCancel}>إلغاء</button>
        <button type="submit" className="btn primary" disabled={formik.isSubmitting}>حفظ</button>
      </div>
    </form>
  );
}

export default function Expenses() {
  const queryClient = useQueryClient();
  const [q, setQ] = useState('');
  const [month, setMonth] = useState('');
  const [editing, setEditing] = useState(null);

  const {
    data: expenses = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => (await getExpenses()).data,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: QUERY_KEY });

  const saveMutation = useMutation({
    mutationFn: ({ id, ...rest }) => {
      const payload = { ...rest, amount: Number(rest.amount) };
      return id ? updateExpense(id, payload) : createExpense(payload);
    },
    onSuccess: () => {
      invalidate();
      setEditing(null);
    },
    onError: (e) => console.error('error', e),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteExpense(id),
    onSuccess: invalidate,
    onError: (e) => console.error('error', e),
  });

  const list = useMemo(
    () =>
      expenses.filter((x) => {
        const okTitle = !q || x.title.includes(q.trim());
        const okMonth = !month || toInput(x.date).startsWith(month);
        return okTitle && okMonth;
      }),
    [expenses, q, month]
  );

  const total = useMemo(() => list.reduce((sum, x) => sum + Number(x.amount || 0), 0), [list]);

  const save = async (values) => {
    try {
      await saveMutation.mutateAsync(values);
    } catch {
      // handled in onError
    }
  };

  const del = (x) => {
    if (!window.confirm(`حذف المصروف «${x.title}»؟`)) return;
    deleteMutation.mutate(x.id);
  };

  const emptyMessage = isLoading
    ? 'جارٍ التحميل...'
    : isError
    ? 'تعذر تحميل المصاريف.'
    : expenses.length
    ? 'لا توجد نتائج مطابقة للبحث.'
    : 'لم تتم إضافة أي مصروف بعد. اضغط «إضافة مصروف» للبدء.';

  return (
    <>
      <PageHead
        title="المصاريف"
        subtitle="سجل مصاريف الجمعية."
        action={
          <button className="btn primary" onClick={() => setEditing({ ...EMPTY, date: today() })}>
            <Icon name="plus" /> إضافة مصروف
          </button>
        }
      />

      <div className="toolbar">
        <div className="search">
          <Icon name="search" />
          <input placeholder="ابحث بعنوان المصروف" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} aria-label="تصفية بالشهر" />
        {month && <button className="btn" onClick={() => setMonth('')}>مسح الشهر</button>}
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>العنوان</th>
              <th>المبلغ</th>
              <th>التاريخ</th>
              <th>اليوم</th>
              <th>ملاحظة</th>
              <th className="actions-col"><span className="sr">إجراءات</span></th>
            </tr>
          </thead>
          <tbody>
            {list.map((x) => (
              <tr key={x.id}>
                <td className="strong">{x.title}</td>
                <td><span className="num">{money(x.amount)}</span></td>
                <td><span className="num">{fmtDate(x.date)}</span></td>
                <td>{dayName(x.date)}</td>
                <td>{x.note || '—'}</td>
                <td className="actions">
                  <button className="icon-btn" onClick={() => setEditing(x)} aria-label={`تعديل ${x.title}`}><Icon name="edit" /></button>
                  <button
                    className="icon-btn danger"
                    onClick={() => del(x)}
                    disabled={deleteMutation.isPending}
                    aria-label={`حذف ${x.title}`}
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
          {list.length > 0 && (
            <tfoot>
              <tr>
                <td className="strong">المجموع</td>
                <td colSpan="5"><span className="num strong">{money(total)}</span></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {editing && (
        <Modal title={editing.id ? 'تعديل المصروف' : 'إضافة مصروف'} onClose={() => setEditing(null)}>
          <ExpenseForm
            initial={editing}
            onSubmit={save}
            onCancel={() => setEditing(null)}
          />
        </Modal>
      )}
    </>
  );
}