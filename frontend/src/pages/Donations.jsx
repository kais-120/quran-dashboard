// src/pages/Donations.jsx
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
  getDonations,
  createDonation,
  updateDonation,
  deleteDonation,
} from '../services/api.js';

const today = () => new Date().toISOString().slice(0, 10);

const EMPTY = {
  donor_type: 'person', // person | organization | anonymous
  donor_name: '',
  donor_phone: '',
  kind: 'money', // money | in_kind
  amount: '',
  item: '',
  quantity: '',
  date: today(),
  note: '',
};

const QUERY_KEY = ['donations'];

const DONOR_TYPES = {
  person: 'فرد',
  organization: 'جهة / مؤسسة',
  anonymous: 'مجهول',
};

const KINDS = {
  money: 'مبلغ مالي',
  in_kind: 'تبرع عيني',
};

const toInput = (d) => (d ? String(d).slice(0, 10) : '');

const dayName = (d) => {
  if (!d) return '';
  const date = new Date(`${toInput(d)}T00:00:00`);
  if (isNaN(date)) return '';
  return date.toLocaleDateString('ar-TN', { weekday: 'long' });
};

const money = (n) => `${Number(n || 0).toFixed(3)} د.ت`;

const emptyToUndef = (v, orig) => (orig === '' || orig === null ? undefined : v);

const donorLabel = (d) => (d.donor_type === 'anonymous' ? 'مجهول' : d.donor_name || '—');

const schema = Yup.object({
  donor_type: Yup.string().oneOf(Object.keys(DONOR_TYPES)).required(),
  donor_name: Yup.string()
    .trim()
    .max(150, 'الاسم طويل جدًا')
    .when('donor_type', {
      is: (v) => v !== 'anonymous',
      then: (s) => s.min(2, 'الاسم قصير جدًا').required('اسم المتبرع مطلوب'),
    }),
  donor_phone: Yup.string().matches(/^[0-9+ ]{8,15}$|^$/, 'أرقام فقط (8 إلى 15 خانة)'),
  kind: Yup.string().oneOf(Object.keys(KINDS)).required(),
  amount: Yup.number()
    .transform(emptyToUndef)
    .typeError('مبلغ غير صالح')
    .when('kind', {
      is: 'money',
      then: (s) => s.moreThan(0, 'المبلغ يجب أن يكون أكبر من 0').required('المبلغ مطلوب'),
    }),
  item: Yup.string()
    .trim()
    .max(200, 'الوصف طويل جدًا')
    .when('kind', {
      is: 'in_kind',
      then: (s) => s.min(2, 'الوصف قصير جدًا').required('وصف التبرع مطلوب'),
    }),
  quantity: Yup.number()
    .transform(emptyToUndef)
    .typeError('كمية غير صالحة')
    .integer('كمية غير صالحة')
    .min(1, 'الكمية يجب أن تكون 1 على الأقل'),
  date: Yup.date().typeError('تاريخ غير صالح').required('التاريخ مطلوب'),
  note: Yup.string().trim().max(255, 'الملاحظة طويلة جدًا'),
});

function DonationForm({ initial, onSubmit, onCancel }) {
  const formik = useFormik({
    initialValues: {
      ...EMPTY,
      ...initial,
      donor_name: initial.donor_name || '',
      donor_phone: initial.donor_phone || '',
      amount: initial.amount ?? '',
      item: initial.item || '',
      quantity: initial.quantity ?? '',
      date: toInput(initial.date) || today(),
      note: initial.note || '',
    },
    validationSchema: schema,
    onSubmit,
  });

  const err = (k) =>
    formik.touched[k] && formik.errors[k] ? <small className="error">{formik.errors[k]}</small> : null;

  const v = formik.values;

  return (
    <form onSubmit={formik.handleSubmit} className="form-grid" noValidate>
      <Field label="نوع المتبرع">
        <select {...formik.getFieldProps('donor_type')}>
          {Object.entries(DONOR_TYPES).map(([k, label]) => (
            <option key={k} value={k}>{label}</option>
          ))}
        </select>
      </Field>

      {v.donor_type !== 'anonymous' && (
        <>
          <Field label={v.donor_type === 'organization' ? 'اسم الجهة' : 'اسم المتبرع'}>
            <input {...formik.getFieldProps('donor_name')} autoFocus />
            {err('donor_name')}
          </Field>
          <Field label="رقم الهاتف (اختياري)">
            <input type="tel" dir="ltr" className="text-start" {...formik.getFieldProps('donor_phone')} />
            {err('donor_phone')}
          </Field>
        </>
      )}

      <Field label="نوع التبرع">
        <select {...formik.getFieldProps('kind')}>
          {Object.entries(KINDS).map(([k, label]) => (
            <option key={k} value={k}>{label}</option>
          ))}
        </select>
      </Field>

      {v.kind === 'money' ? (
        <Field label="المبلغ (د.ت)">
          <input type="number" step="0.001" min="0" dir="ltr" className="text-start" {...formik.getFieldProps('amount')} />
          {err('amount')}
        </Field>
      ) : (
        <>
          <Field label="وصف التبرع (مثال: كتب، حواسيب، ملابس)">
            <input {...formik.getFieldProps('item')} />
            {err('item')}
          </Field>
          <Field label="الكمية (اختياري)">
            <input type="number" min="1" step="1" dir="ltr" className="text-start" {...formik.getFieldProps('quantity')} />
            {err('quantity')}
          </Field>
        </>
      )}

      <Field label="التاريخ">
        <input type="date" {...formik.getFieldProps('date')} />
        {v.date && <small>{dayName(v.date)}</small>}
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

export default function Donations() {
  const queryClient = useQueryClient();
  const [q, setQ] = useState('');
  const [kind, setKind] = useState('');
  const [month, setMonth] = useState('');
  const [editing, setEditing] = useState(null);

  const {
    data: donations = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => (await getDonations()).data,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: QUERY_KEY });

  const saveMutation = useMutation({
    mutationFn: ({ id, ...rest }) => {
      const payload = {
        ...rest,
        donor_name: rest.donor_type === 'anonymous' ? '' : rest.donor_name,
        donor_phone: rest.donor_type === 'anonymous' ? '' : rest.donor_phone,
        amount: rest.kind === 'money' ? Number(rest.amount) : null,
        item: rest.kind === 'in_kind' ? rest.item : '',
        quantity: rest.kind === 'in_kind' && rest.quantity !== '' ? Number(rest.quantity) : null,
      };
      return id ? updateDonation(id, payload) : createDonation(payload);
    },
    onSuccess: () => {
      invalidate();
      setEditing(null);
    },
    onError: (e) => console.error('error', e),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteDonation(id),
    onSuccess: invalidate,
    onError: (e) => console.error('error', e),
  });

  const list = useMemo(
    () =>
      donations.filter((d) => {
        const okQ = !q || [donorLabel(d), d.item, d.donor_phone].join(' ').includes(q.trim());
        const okKind = !kind || d.kind === kind;
        const okMonth = !month || toInput(d.date).startsWith(month);
        return okQ && okKind && okMonth;
      }),
    [donations, q, kind, month]
  );

  const totalMoney = useMemo(
    () => list.filter((d) => d.kind === 'money').reduce((s, d) => s + Number(d.amount || 0), 0),
    [list]
  );
  const inKindCount = useMemo(() => list.filter((d) => d.kind === 'in_kind').length, [list]);

  const save = async (values) => {
    try {
      await saveMutation.mutateAsync(values);
    } catch {
      // handled in onError
    }
  };

  const del = (d) => {
    if (!window.confirm(`حذف تبرع «${donorLabel(d)}» بتاريخ ${fmtDate(d.date)}؟`)) return;
    deleteMutation.mutate(d.id);
  };

  const emptyMessage = isLoading
    ? 'جارٍ التحميل...'
    : isError
    ? 'تعذر تحميل التبرعات.'
    : donations.length
    ? 'لا توجد نتائج مطابقة للبحث.'
    : 'لم تتم إضافة أي تبرع بعد. اضغط «إضافة تبرع» للبدء.';

  return (
    <>
      <PageHead
        title="التبرعات"
        subtitle="سجل التبرعات المالية والعينية."
        action={
          <button className="btn primary" onClick={() => setEditing({ ...EMPTY, date: today() })}>
            <Icon name="plus" /> إضافة تبرع
          </button>
        }
      />

      <div className="toolbar">
        <div className="search">
          <Icon name="search" />
          <input placeholder="ابحث باسم المتبرع أو التبرع" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select value={kind} onChange={(e) => setKind(e.target.value)} aria-label="تصفية بنوع التبرع">
          <option value="">كل الأنواع</option>
          {Object.entries(KINDS).map(([k, label]) => (
            <option key={k} value={k}>{label}</option>
          ))}
        </select>
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} aria-label="تصفية بالشهر" />
        {month && <button className="btn" onClick={() => setMonth('')}>مسح الشهر</button>}
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>المتبرع</th>
              <th>نوع المتبرع</th>
              <th>نوع التبرع</th>
              <th>التفاصيل</th>
              <th>التاريخ</th>
              <th>اليوم</th>
              <th>ملاحظة</th>
              <th className="actions-col"><span className="sr">إجراءات</span></th>
            </tr>
          </thead>
          <tbody>
            {list.map((d) => (
              <tr key={d.id}>
                <td className="strong">{donorLabel(d)}</td>
                <td>{DONOR_TYPES[d.donor_type] || '—'}</td>
                <td>{KINDS[d.kind] || '—'}</td>
                <td>
                  {d.kind === 'money' ? (
                    <span className="num">{money(d.amount)}</span>
                  ) : (
                    <>
                      {d.item}
                      {d.quantity ? <> × <span className="num">{d.quantity}</span></> : null}
                    </>
                  )}
                </td>
                <td><span className="num">{fmtDate(d.date)}</span></td>
                <td>{dayName(d.date)}</td>
                <td>{d.note || '—'}</td>
                <td className="actions">
                  <button className="icon-btn" onClick={() => setEditing(d)} aria-label="تعديل"><Icon name="edit" /></button>
                  <button
                    className="icon-btn danger"
                    onClick={() => del(d)}
                    disabled={deleteMutation.isPending}
                    aria-label="حذف"
                  >
                    <Icon name="trash" />
                  </button>
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr><td colSpan="8" className="empty">{emptyMessage}</td></tr>
            )}
          </tbody>
          {list.length > 0 && (
            <tfoot>
              <tr>
                <td className="strong">المجموع</td>
                <td colSpan="7">
                  <span className="num strong">{money(totalMoney)}</span>
                  {inKindCount > 0 && <> — <span className="num">{inKindCount}</span> تبرع عيني</>}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {editing && (
        <Modal title={editing.id ? 'تعديل التبرع' : 'إضافة تبرع'} onClose={() => setEditing(null)}>
          <DonationForm
            initial={editing}
            onSubmit={save}
            onCancel={() => setEditing(null)}
          />
        </Modal>
      )}
    </>
  );
}