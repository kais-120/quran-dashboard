
import { useState } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useStore } from '../store.jsx';
import Icon from '../components/Icon.jsx';

const validationSchema = Yup.object({
  user: Yup.string()
    .trim()
    .required('اسم المستخدم مطلوب.'),

  pass: Yup.string()
    .required('كلمة المرور مطلوبة.'),
});

export default function Login() {
  const { auth, data } = useStore();
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');

  const formik = useFormik({
    initialValues: {
      user: '',
      pass: '',
    },
    validationSchema,
    onSubmit: async (values, { setSubmitting }) => {
      setError('');

      try {
        const response = await auth(values.user.trim(), values.pass);

        if (!response) {
          setError(
            'اسم المستخدم أو كلمة المرور غير صحيحة. تحقق منهما وحاول مرة أخرى.'
          );
        }
      } catch {
        setError('حدث خطأ أثناء تسجيل الدخول. حاول مرة أخرى.');
      } finally {
        setSubmitting(false);
      }
    },
  });

  return (
    <div className="login">
      <section className="login-hero">
        <p className="login-verse">وَقُل رَّبِّ زِدْنِي عِلْمًا</p>
        <p className="login-name">{data?.association_name}</p>
      </section>

      <section className="login-panel">
        <form onSubmit={formik.handleSubmit} className="login-form">
          <h1>تسجيل الدخول</h1>
          <p className="muted">
            أدخل بيانات حسابك للوصول إلى لوحة التحكم.
          </p>

          <label className="field">
            <span>اسم المستخدم</span>
            <input
              name="user"
              value={formik.values.user}
              onChange={(e) => {
                formik.handleChange(e);
                setError('');
              }}
              onBlur={formik.handleBlur}
              autoComplete="username"
              autoFocus
              dir="rtl"
              className="text-start"
              disabled={formik.isSubmitting}
            />

            {formik.touched.user && formik.errors.user && (
              <p className="form-error">{formik.errors.user}</p>
            )}
          </label>

          <label className="field">
            <span>كلمة المرور</span>

            <div className="pass">
              <input
                name="pass"
                type={show ? 'text' : 'password'}
                value={formik.values.pass}
                onChange={(e) => {
                  formik.handleChange(e);
                  setError('');
                }}
                onBlur={formik.handleBlur}
                autoComplete="current-password"
                dir="rtl"
                className="text-start"
                disabled={formik.isSubmitting}
              />

              <button
                type="button"
                className="icon-btn"
                onClick={() => setShow((s) => !s)}
                aria-label={
                  show ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'
                }
                aria-pressed={show}
              >
                <Icon name={show ? 'eye-off' : 'eye'} />
              </button>
            </div>

            {formik.touched.pass && formik.errors.pass && (
              <p className="form-error">{formik.errors.pass}</p>
            )}
          </label>

          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}

          <button
            className="btn primary block"
            type="submit"
            disabled={formik.isSubmitting}
          >
            {formik.isSubmitting ? 'جارٍ تسجيل الدخول...' : 'دخول'}
          </button>
        </form>

        <footer className="login-credit">
          تطوير <strong>codeNex</strong> © {new Date().getFullYear()}
        </footer>
      </section>
    </div>
  );
}
