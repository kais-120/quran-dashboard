import { useRef, useState } from 'react';
import { useStore } from '../store.jsx';
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

export default function Settings() {
  const store = useStore();
  const { settings, setSettings, replaceAll, clearRecords } = store;
  const [form, setForm] = useState({
    associationName: settings.associationName,
    schoolYear: settings.schoolYear,
    defaultFee: settings.defaultFee,
    currency: settings.currency,
    phone: settings.phone,
    address: settings.address,
  });
  const [acc, setAcc] = useState({ adminUser: settings.adminUser, adminPass: settings.adminPass });
  const [msg, setMsg] = useState('');
  const fileRef = useRef(null);

  const flash = (m) => {
    setMsg(m);
    setTimeout(() => setMsg(''), 3000);
  };

  const saveGeneral = (e) => {
    e.preventDefault();
    setSettings({ ...form, defaultFee: Number(form.defaultFee) });
    flash('تم حفظ الإعدادات.');
  };

  const saveAccount = (e) => {
    e.preventDefault();
    if (acc.adminPass.length < 6) return flash('كلمة المرور قصيرة: استعمل 6 أحرف على الأقل.');
    setSettings({ adminUser: acc.adminUser.trim(), adminPass: acc.adminPass });
    flash('تم تحديث بيانات الدخول.');
  };

  const exportData = () => {
    const blob = new Blob(
      [JSON.stringify({ settings: store.settings, students: store.students, teachers: store.teachers, registrations: store.registrations }, null, 2)],
      { type: 'application/json' }
    );
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `sauvegarde-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importData = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const obj = JSON.parse(reader.result);
        if (!Array.isArray(obj.students)) throw new Error();
        if (window.confirm('سيتم استبدال البيانات الحالية بالنسخة المستوردة. هل تريد المتابعة؟')) {
          replaceAll(obj);
          flash('تم استيراد النسخة الاحتياطية.');
        }
      } catch {
        flash('الملف غير صالح. اختر نسخة احتياطية تم تصديرها من هذه اللوحة.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const wipe = () => {
    if (window.confirm('سيتم حذف جميع التلاميذ والمعلمين والتسجيلات نهائيًا. هل أنت متأكد؟')) {
      clearRecords();
      flash('تم حذف جميع البيانات.');
    }
  };

  const f = (k) => (e) => setForm((s) => ({ ...s, [k]: e.target.value }));

  return (
    <>
      <PageHead title="الإعدادات العامة" subtitle="معلومات الجمعية والقوائم المستعملة في النماذج وحساب الدخول." />
      {msg && <div className="toast" role="status">{msg}</div>}

      <section className="panel">
        <h2>معلومات الجمعية</h2>
        <form onSubmit={saveGeneral} className="form-grid">
          <label className="field wide"><span>اسم الجمعية</span><input value={form.associationName} onChange={f('associationName')} required /></label>
          <label className="field"><span>السنة الدراسية الحالية</span><input value={form.schoolYear} onChange={f('schoolYear')} dir="ltr" className="text-start" required /></label>
          <label className="field"><span>رسوم التسجيل الافتراضية</span><input type="number" min="0" step="any" value={form.defaultFee} onChange={f('defaultFee')} required /></label>
          <label className="field"><span>هاتف الجمعية</span><input type="tel" dir="ltr" className="text-start" value={form.phone} onChange={f('phone')} /></label>
          <label className="field"><span>العنوان</span><input value={form.address} onChange={f('address')} /></label>
          <div className="form-actions"><button className="btn primary" type="submit">حفظ المعلومات</button></div>
        </form>
      </section>

  

      <section className="panel">
        <h2>حساب الدخول</h2>
        <form onSubmit={saveAccount} className="form-grid">
          <label className="field"><span>اسم المستخدم</span><input dir="ltr" className="text-start" value={acc.adminUser} onChange={(e) => setAcc({ ...acc, adminUser: e.target.value })} required /></label>
          <label className="field"><span>كلمة المرور</span><input dir="ltr" className="text-start" type="password" value={acc.adminPass} onChange={(e) => setAcc({ ...acc, adminPass: e.target.value })} required /></label>
          <p className="muted small wide">يتم التحقق من الدخول داخل المتصفح فقط. لحماية حقيقية للبيانات اربط اللوحة بخادم.</p>
          <div className="form-actions"><button className="btn primary" type="submit">تحديث بيانات الدخول</button></div>
        </form>
      </section>

    </>
  );
}
