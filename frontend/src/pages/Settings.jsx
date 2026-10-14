import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useStore } from '../store.jsx';
import { getSetting, updateSetting, profile, update, updatePassword } from '../services/api';
import PageHead from '../components/PageHead.jsx';
import Icon from '../components/Icon.jsx';

function ListEditor({ title, hint, items, onChange, placeholder }) {
  const [value, setValue] = useState('');
  const addItem = (e) => {
    e.preventDefault();
    const v = value.trim();
    if (!v || items.includes(v)) return;
    onChange([...items, v]);
    setValue('');
  };
  return (
    <div className="list-editor">
      <h3>{title}</h3>
      <p className="muted small">{hint}</p>
      <ul className="chips">
        {items.map((it) => (
          <li key={it}>
            {it}
            <button type="button" onClick={() => onChange(items.filter((x) => x !== it))} aria-label={`حذف ${it}`}>
              <Icon name="x" size={14} />
            </button>
          </li>
        ))}
        {items.length === 0 && <li className="empty-chip">القائمة فارغة</li>}
      </ul>
      <form onSubmit={addItem} className="inline-form">
        <input value={value} onChange={(e) => setValue(e.target.value)} placeholder={placeholder} />
        <button className="btn" type="submit"><Icon name="plus" /> إضافة</button>
      </form>
    </div>
  );
}

const errMsg = (err, fallback) => err?.response?.data?.message || fallback;

export default function Settings() {
  const qc = useQueryClient();
  const store = useStore();
  const { isAdmin } = store;

  const [form, setForm] = useState({
    association_name: '',
    school_year: '',
    default_fee: '',
    phone: '',
    address: '',
  });
  const [acc, setAcc] = useState({ username: '' });
  const [pwd, setPwd] = useState({ ancien: '', nouveau: '' });
  // { type: 'error' | 'success', text: string } | null
  const [msg, setMsg] = useState(null);
  const [usernameStatus, setUsernameStatus] = useState(null);

  const flash = (text, type = 'success') => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 3000);
  };

  // ---------- Queries ----------
  const settingQuery = useQuery({
    queryKey: ['setting'],
    queryFn: async () => (await getSetting()).data,
  });
  const profileQuery = useQuery({
    queryKey: ['profile'],
    queryFn: async () => (await profile()).data.user,
  });

  const settings = settingQuery.data;

  useEffect(() => {
    if (!settings) return;
    setForm({
      association_name: settings.association_name ?? '',
      school_year: settings.school_year ?? '',
      default_fee: settings.default_fee ?? '',
      phone: settings.phone ?? '',
      address: settings.address ?? '',
    });
  }, [settings]);

  useEffect(() => {
    if (!profileQuery.data) return;
    setAcc({ username: profileQuery.data.username ?? '' });
  }, [profileQuery.data]);

  // ---------- Mutations ----------
  const settingMutation = useMutation({
    mutationFn: ({ id, data }) => updateSetting(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['setting'] });
      flash('تم حفظ الإعدادات.');
    },
    onError: (err) => flash(errMsg(err, 'تعذر حفظ الإعدادات.'), 'error'),
  });

  const profileMutation = useMutation({
    mutationFn: (username) => update(username),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profile'] });
      setUsernameStatus({ type: 'success', text: 'تم تحديث اسم المستخدم.' });
    },
    onError: (err) => {
      console.log('onError', err);
      if (err?.response?.status === 409) {
        setUsernameStatus({ type: 'error', text: 'اسم المستخدم موجود بالفعل' });
      } else {
        setUsernameStatus({
          type: 'error',
          text: err?.response?.data?.message || 'تعذر تحديث اسم المستخدم.',
        });
      }
    },
  });

  const passwordMutation = useMutation({
    mutationFn: ({ ancien, nouveau }) => updatePassword(ancien, nouveau),
    onSuccess: () => {
      setPwd({ ancien: '', nouveau: '' });
      flash('تم تغيير كلمة المرور.');
    },
    onError: (err) => flash(errMsg(err, 'كلمة المرور الحالية غير صحيحة.'), 'error'),
  });

  // ---------- Handlers ----------
  const saveGeneral = (e) => {
    e.preventDefault();
    if (!settings?.id) return flash('الإعدادات غير جاهزة بعد.', 'error');
    settingMutation.mutate({
      id: settings.id,
      data: { ...form, defaultFee: Number(form.default_fee) },
    });
  };

  const saveAccount = (e) => {
    e.preventDefault();
    setUsernameStatus(null);
    profileMutation.mutate(acc.username.trim());
  };

  const savePassword = (e) => {
    e.preventDefault();
    if (pwd.nouveau.length < 6) return flash('كلمة المرور قصيرة: استعمل 6 أحرف على الأقل.', 'error');
    passwordMutation.mutate(pwd);
  };

  const f = (k) => (e) => setForm((s) => ({ ...s, [k]: e.target.value }));

  if (settingQuery.isLoading || profileQuery.isLoading) {
    return <p className="muted">جارٍ التحميل...</p>;
  }
  if (settingQuery.isError) {
    return <p className="muted">تعذر تحميل الإعدادات.</p>;
  }

  return (
    <>
      <PageHead
        title="الإعدادات"
        subtitle={
          isAdmin
            ? 'معلومات الجمعية وإعدادات حساب الدخول.'
            : 'إعدادات حساب الدخول وكلمة المرور.'
        }
      />
      {msg && (
        <div className={`toast ${msg.type === 'error' ? 'error' : ''}`} role={msg.type === 'error' ? 'alert' : 'status'}>
          {msg.text}
        </div>
      )}
      {isAdmin && (
        <section className="panel">
          <h2>معلومات الجمعية</h2>
          <form onSubmit={saveGeneral} className="form-grid">
            <label className="field wide"><span>اسم الجمعية</span><input value={form.association_name} onChange={f('association_name')} required /></label>
            <label className="field"><span>السنة الدراسية الحالية</span><input value={form.school_year} onChange={f('school_year')} dir="ltr" className="text-start" required /></label>
            <label className="field"><span>رسوم التسجيل الافتراضية</span><input type="number" min="0" step="any" value={form.default_fee} onChange={f('default_fee')} required /></label>
            <label className="field"><span>هاتف الجمعية</span><input type="tel" dir="ltr" className="text-start" value={form.phone} onChange={f('phone')} /></label>
            <label className="field"><span>العنوان</span><input value={form.address} onChange={f('address')} /></label>
            <div className="form-actions">
              <button className="btn primary" type="submit" disabled={settingMutation.isPending}>
                {settingMutation.isPending ? 'جارٍ الحفظ...' : 'حفظ المعلومات'}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="panel">
        <h2>حساب الدخول</h2>
        <form onSubmit={saveAccount} className="form-grid">
          <div>
            <label className="field">
              <span>اسم المستخدم</span>
              <input
                dir="ltr"
                className="text-start"
                value={acc.username}
                onChange={(e) => {
                  setAcc({ ...acc, username: e.target.value });
                  if (usernameStatus) setUsernameStatus(null);
                }}
                aria-invalid={usernameStatus?.type === 'error'}
                required
              />
            </label>
            {usernameStatus && (
              <p
                role={usernameStatus.type === 'error' ? 'alert' : 'status'}
                style={{
                  margin: '6px 0 0',
                  fontSize: '0.85rem',
                  color: usernameStatus.type === 'error' ? '#dc2626' : '#16a34a',
                }}
              >
                {usernameStatus.text}
              </p>
            )}
          </div>
          <div className="form-actions">
            <button className="btn primary" type="submit" disabled={profileMutation.isPending}>
              {profileMutation.isPending ? 'جارٍ الحفظ...' : 'تحديث اسم المستخدم'}
            </button>
          </div>
        </form>

        <form onSubmit={savePassword} className="form-grid">
          <label className="field"><span>كلمة المرور الحالية</span><input dir="ltr" className="text-start" type="password" value={pwd.ancien} onChange={(e) => setPwd({ ...pwd, ancien: e.target.value })} required /></label>
          <label className="field"><span>كلمة المرور الجديدة</span><input dir="ltr" className="text-start" type="password" value={pwd.nouveau} onChange={(e) => setPwd({ ...pwd, nouveau: e.target.value })} required /></label>
          <div className="form-actions">
            <button className="btn primary" type="submit" disabled={passwordMutation.isPending}>
              {passwordMutation.isPending ? 'جارٍ الحفظ...' : 'تغيير كلمة المرور'}
            </button>
          </div>
        </form>
      </section>
    </>
  );
}