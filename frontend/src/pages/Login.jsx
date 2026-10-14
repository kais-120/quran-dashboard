import { useState } from 'react';
import { useStore } from '../store.jsx';
import Icon from '../components/Icon.jsx';

export default function Login() {
  const { auth, data } = useStore();
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');

  const submit = (e) => {
    e.preventDefault();
    if (!auth(user.trim(), pass)) setError('اسم المستخدم أو كلمة المرور غير صحيحة. تحقق منهما وحاول مرة أخرى.');
  };

  return (
    <div className="login">
      <section className="login-hero">
        <p className="login-verse">وَقُل رَّبِّ زِدْنِي عِلْمًا</p>
        <p className="login-name">{data?.association_name}</p>
      </section>

      <section className="login-panel">
        <form onSubmit={submit} className="login-form">
          <h1>تسجيل الدخول</h1>
          <p className="muted">أدخل بيانات حسابك للوصول إلى لوحة التحكم.</p>

          <label className="field">
            <span>اسم المستخدم</span>
            <input value={user} onChange={(e) => { setUser(e.target.value); setError(''); }} autoComplete="username" autoFocus required dir="rtl" className="text-start" />
          </label>

          <label className="field">
            <span>كلمة المرور</span>
            <div className="pass">
              <input type={show ? 'text' : 'password'} value={pass} onChange={(e) => { setPass(e.target.value); setError(''); }} autoComplete="current-password" required dir="rtl" className="text-start" />
              <button type="button" className="icon-btn" onClick={() => setShow((s) => !s)} aria-label={show ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'} aria-pressed={show}>
                <Icon name="eye" />
              </button>
            </div>
          </label>

          {error && <p className="form-error" role="alert">{error}</p>}

          <button className="btn primary block" type="submit">دخول</button>
        </form>

        <footer className="login-credit">
          تطوير <strong>codeNex</strong> © {new Date().getFullYear()}
        </footer>
      </section>
    </div>
  );
}