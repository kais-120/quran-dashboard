import { useEffect, useMemo, useState } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import Modal from '../components/Modal.jsx';
import Field from '../components/Field.jsx';
import PageHead from '../components/PageHead.jsx';
import Icon from '../components/Icon.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';
import { createUser, deleteUser, getUsers, updateUser } from '../services/api.js';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

const EMPTY = { full_name: '', username: '', password: '' };
const PAGE_SIZE = 10;

const ROLE_LABELS = { admin: 'رئيس الفرع', supervisor: 'مشرف' };

const USERNAME_EXISTS_MSG = 'اسم المستخدم موجود بالفعل';

const errMsg = (err) =>
  err?.response?.data?.message || err?.message || 'حدث خطأ غير متوقع';

// Adjust to match what your backend returns for a duplicate username
const isUsernameError = (err) => {
  const msg = String(err?.response?.data?.message || '');
  return err?.response?.status === 409 || /username|exist|موجود|مستخدم/i.test(msg);
};

const schema = Yup.object({
  full_name: Yup.string().trim().min(3, 'الاسم قصير جدًا').max(100, 'الاسم طويل جدًا').required('الاسم مطلوب'),
  username: Yup.string().trim().required('اسم المستخدم مطلوب'),
  changePassword: Yup.boolean(),
  password: Yup.string().when('changePassword', {
    is: true,
    then: (s) => s.min(6, 'كلمة المرور قصيرة جدًا (6 أحرف على الأقل)').required('كلمة المرور مطلوبة'),
    otherwise: (s) => s.notRequired(),
  }),
});

function UserForm({ initial, onSubmit, onCancel, isSubmitting }) {
  const isEdit = Boolean(initial.id);
  const [formError, setFormError] = useState('');

  const formik = useFormik({
    initialValues: {
      full_name: initial.full_name ?? '',
      username: initial.username ?? '',
      password: '',
      // on create the password is always required, on edit it's optional
      changePassword: !isEdit,
    },
    validationSchema: schema,
    onSubmit: (values) => {
      setFormError('');
      const { changePassword, password, ...rest } = values;
      const payload = { ...rest };
      // role is never sent: the backend default ("supervisor") applies on create
      if (changePassword && password) payload.password = password;
      onSubmit({ id: initial.id, payload }, (err) => {
        if (isUsernameError(err)) {
          formik.setFieldTouched('username', true, false);
          formik.setFieldError('username', USERNAME_EXISTS_MSG);
        } else {
          setFormError(errMsg(err));
        }
      });
    },
  });

  const err = (k) =>
    formik.touched[k] && formik.errors[k] ? (
      <small className="error" style={{ color: 'red' }}>{formik.errors[k]}</small>
    ) : null;

  const onToggle = (e) => {
    formik.setFieldValue('changePassword', e.target.checked);
    if (!e.target.checked) {
      formik.setFieldValue('password', '');
      formik.setFieldTouched('password', false, false);
    }
  };

  return (
    <form onSubmit={formik.handleSubmit} className="form-grid" noValidate>
      <Field label="الاسم" wide>
        <input {...formik.getFieldProps('full_name')} autoFocus />
        {err('full_name')}
      </Field>

      <Field label="اسم المستخدم" wide>
        <input type="text" dir="ltr" className="text-start" {...formik.getFieldProps('username')} />
        {err('username')}
      </Field>

      {isEdit && (
        <Field label="كلمة المرور" wide>
          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 8, cursor: 'pointer' }}>
            <input type="checkbox" style={{ width: 'auto', margin: 0 }} checked={formik.values.changePassword} onChange={onToggle} />
            <span>تغيير كلمة المرور</span>
          </label>
        </Field>
      )}

      {formik.values.changePassword && (
        <Field label={isEdit ? 'كلمة المرور الجديدة' : 'كلمة المرور'} wide>
          <input
            type="password"
            dir="ltr"
            className="text-start"
            autoComplete="new-password"
            {...formik.getFieldProps('password')}
          />
          {err('password')}
        </Field>
      )}

      {formError && (
        <small className="error" style={{ color: 'red', gridColumn: '1 / -1' }}>{formError}</small>
      )}

      <div className="form-actions">
        <button type="button" className="btn" onClick={onCancel}>إلغاء</button>
        <button type="submit" className="btn primary" disabled={isSubmitting}>حفظ</button>
      </div>
    </form>
  );
}

export default function Users() {
  const queryClient = useQueryClient();
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null);
  const [toDelete, setToDelete] = useState(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['users'] });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: async () => (await getUsers()).data.users,
  });

  // errors are handled per-call (see onSubmit below) so the modal can show them
  const saveMutation = useMutation({
    mutationFn: ({ id, payload }) =>
      id ? updateUser(id, payload) : createUser(payload),
    onSuccess: () => {
      setEditing(null);
      invalidate();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteUser(id),
    onSuccess: () => {
      setToDelete(null);
      invalidate();
    },
    onError: (err) => window.alert(errMsg(err)),
  });

  const list = useMemo(
    () =>
      users.filter(
        (u) => !q || [u.full_name, u.username].join(' ').includes(q.trim())
      ),
    [users, q]
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
        title="المستخدمون"
        subtitle="إدارة حسابات المستخدمين."
        action={
          <button className="btn primary" onClick={() => setEditing({ ...EMPTY })}>
            <Icon name="plus" /> إضافة مستخدم
          </button>
        }
      />

      <div className="toolbar">
        <div className="search">
          <Icon name="search" />
          <input
            placeholder="ابحث بالاسم أو اسم المستخدم"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>الاسم</th>
              <th>اسم المستخدم</th>
              <th>الدور</th>
              <th className="actions-col"><span className="sr">إجراءات</span></th>
            </tr>
          </thead>
          <tbody>
            {pagedList.map((u) => (
              <tr key={u.id}>
                <td className="strong">{u.full_name}</td>
                <td><span className="num">{u.username}</span></td>
                <td><span className="tag">{ROLE_LABELS[u.role] || u.role || '—'}</span></td>
                <td className="actions">
                  <button className="icon-btn" onClick={() => setEditing(u)} aria-label={`تعديل ${u.full_name}`}><Icon name="edit" /></button>
                  <button disabled={u.role === "admin"} className="icon-btn danger" onClick={() => setToDelete(u)} aria-label={`حذف ${u.full_name}`}><Icon name="trash" /></button>
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr><td colSpan="4" className="empty">
                {users.length ? 'لا توجد نتائج مطابقة. غيّر البحث.' : 'لم تتم إضافة أي مستخدم بعد. اضغط «إضافة مستخدم» للبدء.'}
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
          title="حذف المستخدم"
          message={`هل تريد حذف "${toDelete.full_name}"؟`}
          confirmText="حذف"
          danger
          onClose={() => setToDelete(null)}
          onConfirm={() => deleteMutation.mutate(toDelete.id)}
        />
      )}

      {editing && (
        <Modal title={editing.id ? 'تعديل المستخدم' : 'إضافة مستخدم'} onClose={() => setEditing(null)}>
          <UserForm
            initial={editing}
            isSubmitting={saveMutation.isPending}
            onSubmit={(vars, onError) => saveMutation.mutate(vars, { onError })}
            onCancel={() => setEditing(null)}
          />
        </Modal>
      )}
    </>
  );
}