import { useEffect, useMemo, useState } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import Modal from '../components/Modal.jsx';
import Field from '../components/Field.jsx';
import PageHead from '../components/PageHead.jsx';
import Icon from '../components/Icon.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';
import { age, fmtDate } from '../utils.js';
import { createStudent, deleteStudent, getGroups, getStudents, updateStudent } from '../services/api.js';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

const EMPTY = { name: '', father_name: '', father_phone: '', birthdate: '', group_id: '', memorized_hizb: '' };
const PAGE_SIZE = 10;
const MAX_HIZB = 60;
const HIZB_STEP = 0.25;

const errMsg = (err) =>
  err?.response?.data?.message || err?.message || 'حدث خطأ غير متوقع';

const getGroupId = (s) =>
  s.group_id ?? s.studentGroups?.[0]?.group_id ?? s.studentGroups?.[0]?.group?.id ?? '';

const hizbRule = Yup.number()
  .transform((value, original) => (original === '' || original == null ? undefined : value))
  .typeError('رقم غير صالح')
  .min(0, 'الحد الأدنى 0')
  .max(MAX_HIZB, `الحد الأقصى ${MAX_HIZB}`)
  .test('quarter', 'يجب أن يكون من مضاعفات 0.25', (v) => v === undefined || (v * 4) % 1 === 0);

const schema = Yup.object({
  name: Yup.string().trim().min(3, 'الاسم قصير جدًا').max(100, 'الاسم طويل جدًا').required('الاسم واللقب مطلوب'),
  group_id: Yup.string().required('الفوج مطلوب'),
  birthdate: Yup.date()
    .typeError('تاريخ غير صالح')
    .max(new Date(), 'لا يمكن أن يكون التاريخ في المستقبل')
    .required('تاريخ الميلاد مطلوب'),
  father_name: Yup.string().trim().min(3, 'الاسم قصير جدًا').notRequired(),
  father_phone: Yup.string()
    .matches(/^[0-9+ ]{8}$/, {
      message: 'أرقام فقط (8 خانة)',
      excludeEmptyString: true,
    })
    .notRequired(),
  memorized_hizb: hizbRule.notRequired(),
});

const hizbSchema = Yup.object({
  memorized_hizb: hizbRule.required('العدد مطلوب'),
});

function StudentForm({ initial, groups, onSubmit, onCancel, isSubmitting }) {
  const formik = useFormik({
    initialValues: {
      name: initial.name ?? '',
      father_name: initial.father_name ?? '',
      father_phone: initial.father_phone ?? '',
      birthdate: initial.birthdate ? String(initial.birthdate).slice(0, 10) : '',
      group_id: String(getGroupId(initial)),
      memorized_hizb: initial.memorized != null && initial.memorized !== ''
        ? Number(initial.memorized)
        : '',
    },
    validationSchema: schema,
    onSubmit: (values) => {
      onSubmit({
        id: initial.id,
        payload: {
          ...values,
          memorized_hizb: values.memorized_hizb === '' ? 0 : Number(values.memorized_hizb),
        },
      });
    },
  });

  const err = (k) =>
    formik.touched[k] && formik.errors[k] ? <small className="error">{formik.errors[k]}</small> : null;

  return (
    <form onSubmit={formik.handleSubmit} className="form-grid" noValidate>
      <Field label="الاسم واللقب" wide>
        <input {...formik.getFieldProps('name')} autoFocus />
        {err('name')}
      </Field>
      <Field label="الفوج">
        <select {...formik.getFieldProps('group_id')}>
          <option value="">اختر الفوج</option>
          {groups.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
        {err('group_id')}
      </Field>
      <Field label="تاريخ الميلاد">
        <input type="date" {...formik.getFieldProps('birthdate')} />
        {err('birthdate')}
      </Field>
      <Field label="المحفوظ (عدد الأحزاب)">
        <input
          type="number"
          min="0"
          max={MAX_HIZB}
          step={HIZB_STEP}
          dir="ltr"
          className="text-start"
          {...formik.getFieldProps('memorized_hizb')}
        />
        {err('memorized_hizb')}
      </Field>
      <Field label="اسم الولي">
        <input {...formik.getFieldProps('father_name')} />
        {err('father_name')}
      </Field>
      <Field label="هاتف الولي">
        <input type="tel" dir="ltr" className="text-start" {...formik.getFieldProps('father_phone')} />
        {err('father_phone')}
      </Field>
      <div className="form-actions">
        <button type="button" className="btn" onClick={onCancel}>إلغاء</button>
        <button type="submit" className="btn primary" disabled={isSubmitting}>حفظ</button>
      </div>
    </form>
  );
}

function HizbForm({ student, onSubmit, onCancel, isSubmitting }) {
  const formik = useFormik({
    initialValues: { memorized_hizb: Number(student.memorized ?? 0) },
    validationSchema: hizbSchema,
    onSubmit: (values) => onSubmit({ student, hizb: Number(values.memorized_hizb) }),
  });

  const step = (delta) => {
    const current = Number(formik.values.memorized_hizb) || 0;
    const next = Math.min(MAX_HIZB, Math.max(0, current + delta));
    formik.setFieldValue('memorized_hizb', next);
  };

  const showError = formik.touched.memorized_hizb && formik.errors.memorized_hizb;

  return (
    <form onSubmit={formik.handleSubmit} className="form-grid" noValidate>
      <Field label={`عدد الأحزاب المحفوظة لدى ${student.name}`} wide>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }} dir="ltr">
          <button type="button" className="btn" onClick={() => step(-1)} aria-label="إنقاص حزب">−1</button>
          <button type="button" className="btn" onClick={() => step(-HIZB_STEP)} aria-label="إنقاص ربع حزب">−¼</button>
          <input
            type="number"
            min="0"
            max={MAX_HIZB}
            step={HIZB_STEP}
            className="text-start"
            style={{ flex: 1, minWidth: 0 }}
            autoFocus
            {...formik.getFieldProps('memorized_hizb')}
          />
          <button type="button" className="btn" onClick={() => step(HIZB_STEP)} aria-label="إضافة ربع حزب">+¼</button>
          <button type="button" className="btn" onClick={() => step(1)} aria-label="إضافة حزب">+1</button>
        </div>
        {showError ? <small className="error">{formik.errors.memorized_hizb}</small> : null}
        <small className="muted">من 0 إلى {MAX_HIZB} حزبًا (بمضاعفات 0.25)</small>
      </Field>
      <div className="form-actions">
        <button type="button" className="btn" onClick={onCancel}>إلغاء</button>
        <button type="submit" className="btn primary" disabled={isSubmitting}>حفظ</button>
      </div>
    </form>
  );
}

export default function Students() {
  const queryClient = useQueryClient();
  const [q, setQ] = useState('');
  const [fClass, setFClass] = useState('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [hizbTarget, setHizbTarget] = useState(null);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['students'] });
    queryClient.invalidateQueries({ queryKey: ['groups'] });
    queryClient.invalidateQueries({ queryKey: ['courses'] });
  };

  const { data: students = [] } = useQuery({
    queryKey: ['students'],
    queryFn: async () => (await getStudents()).data,
  });

  const { data: groups = [] } = useQuery({
    queryKey: ['groups'],
    queryFn: async () => (await getGroups()).data,
  });

  const saveMutation = useMutation({
    mutationFn: ({ id, payload }) =>
      id ? updateStudent(id, payload) : createStudent(payload),
    onSuccess: () => {
      setEditing(null);
      invalidate();
    },
    onError: (err) => window.alert(errMsg(err)),
  });

  const hizbMutation = useMutation({
    mutationFn: ({ student, hizb }) =>
      updateStudent(student.id, {
        name: student.name,
        father_name: student.father_name ?? '',
        father_phone: student.father_phone ?? '',
        birthdate: student.birthdate ? String(student.birthdate).slice(0, 10) : '',
        group_id: String(getGroupId(student)),
        memorized_hizb: hizb,
      }),
    onSuccess: () => {
      setHizbTarget(null);
      invalidate();
    },
    onError: (err) => window.alert(errMsg(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteStudent(id),
    onSuccess: () => {
      setToDelete(null);
      invalidate();
    },
    onError: (err) => window.alert(errMsg(err)),
  });

  const list = useMemo(
    () =>
      students.filter((s) => {
        const groupId = s.studentGroups?.[0]?.group_id ?? s.studentGroups?.[0]?.group?.id;
        return (
          (!fClass || String(groupId) === String(fClass)) &&
          (!q || [s.name, s.father_name, s.father_phone].join(' ').includes(q.trim()))
        );
      }),
    [students, q, fClass]
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
        title="التلاميذ"
        subtitle="إدارة بيانات التلاميذ ومستوياتهم وأفواجهم."
        action={
          <button className="btn primary" onClick={() => setEditing({ ...EMPTY })}>
            <Icon name="plus" /> إضافة تلميذ
          </button>
        }
      />

      <div className="toolbar">
        <div className="search">
          <Icon name="search" />
          <input
            placeholder="ابحث بالاسم أو اسم الولي أو الهاتف"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <select
          value={fClass}
          onChange={(e) => {
            setFClass(e.target.value);
            setPage(1);
          }}
          aria-label="تصفية حسب الفوج"
        >
          <option value="">كل الأفواج</option>
          {groups.map((c) => <option value={c.id} key={c.id}>{c.label}</option>)}
        </select>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>الاسم واللقب</th>
              <th>الفوج</th>
              <th>المحفوظ</th>
              <th>تاريخ الميلاد</th>
              <th>اسم الولي</th>
              <th>هاتف الولي</th>
              <th className="actions-col"><span className="sr">إجراءات</span></th>
            </tr>
          </thead>
          <tbody>
            {pagedList.map((s) => (
              <tr key={s.id}>
                <td className="strong">{s.name}</td>
                <td><span className="tag">{s.studentGroups?.[0]?.group?.label || '—'}</span></td>
                <td>
                  <button
                  disabled={s?.studentGroups?.length === 0}
                    type="button"
                    className="btn"
                    onClick={() => setHizbTarget(s)}
                    aria-label={`تحديث محفوظ ${s.name}`}
                  >
                    <span className="num">{Number(s.memorized ?? 0)}</span> حزب
                  </button>
                </td>
                <td><span className="num">{fmtDate(s.birthdate)}</span> <small className="muted">({age(s.birthdate)})</small></td>
                <td>{s.father_name}</td>
                <td><span className="num">{s.father_phone}</span></td>
                <td className="actions">
                  <button className="icon-btn" onClick={() => setEditing(s)} aria-label={`تعديل ${s.name}`}><Icon name="edit" /></button>
                  <button className="icon-btn danger" onClick={() => setToDelete(s)} aria-label={`حذف ${s.name}`}><Icon name="trash" /></button>
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr><td colSpan="7" className="empty">
                {students.length ? 'لا توجد نتائج مطابقة. غيّر البحث أو التصفية.' : 'لم تتم إضافة أي تلميذ بعد. اضغط «إضافة تلميذ» للبدء.'}
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
          title="حذف التلميذ"
          message={`هل تريد حذف "${toDelete.name}"؟`}
          confirmText="حذف"
          danger
          onClose={() => setToDelete(null)}
          onConfirm={() => deleteMutation.mutate(toDelete.id)}
        />
      )}

      {editing && (
        <Modal title={editing.id ? 'تعديل بيانات التلميذ' : 'إضافة تلميذ'} onClose={() => setEditing(null)}>
          <StudentForm
            initial={editing}
            groups={groups}
            isSubmitting={saveMutation.isPending}
            onSubmit={(vars) => saveMutation.mutate(vars)}
            onCancel={() => setEditing(null)}
          />
        </Modal>
      )}

      {hizbTarget && (
        <Modal title="تحديث المحفوظ" onClose={() => setHizbTarget(null)}>
          <HizbForm
            student={hizbTarget}
            isSubmitting={hizbMutation.isPending}
            onSubmit={(vars) => hizbMutation.mutate(vars)}
            onCancel={() => setHizbTarget(null)}
          />
        </Modal>
      )}
    </>
  );
}