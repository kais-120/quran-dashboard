import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { login } from './services/api';

const DATA_KEY = 'qa-data-v1';
const AUTH_KEY = 'qa-auth';

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export const DEFAULT_SETTINGS = {
  associationName: 'جمعية القرآن الكريم',
  schoolYear: '2025/2026',
  defaultFee: 50,
  currency: 'د.ت',
  phone: '',
  address: '',
  levels: ['التمهيدي', 'المبتدئ', 'المتوسط', 'المتقدم', 'الحفظ', 'الإجازة'],
  classes: ['القسم أ', 'القسم ب', 'القسم ج'],
  adminUser: 'admin',
  adminPass: 'admin123',
};

const seed = () => ({
  settings: { ...DEFAULT_SETTINGS },
  students: [
    { id: 's1', name: 'يوسف بن علي', level: 'المبتدئ', fatherName: 'علي بن صالح', fatherPhone: '98 123 456', birthDate: '2015-04-12', className: 'القسم أ' },
    { id: 's2', name: 'مريم الهادي', level: 'المتوسط', fatherName: 'الهادي المنصوري', fatherPhone: '55 987 654', birthDate: '2013-09-03', className: 'القسم ب' },
    { id: 's3', name: 'عمر الطرابلسي', level: 'الحفظ', fatherName: 'محمد الطرابلسي', fatherPhone: '22 456 789', birthDate: '2011-01-25', className: 'القسم ج' },
  ],
  teachers: [
    { id: 't1', lastName: 'الجلاصي', firstName: 'عبد الرحمن', startDate: '2019-09-15', phone: '97 111 222' },
    { id: 't2', lastName: 'بن عمار', firstName: 'فاطمة', startDate: '2022-10-01', phone: '50 333 444' },
  ],
  registrations: [
    { id: 'r1', studentId: 's1', schoolYear: '2025/2026', date: '2025-09-20', className: 'القسم أ', fee: 50, paid: 50 },
    { id: 'r2', studentId: 's2', schoolYear: '2025/2026', date: '2025-09-22', className: 'القسم ب', fee: 50, paid: 20 },
  ],
});

function load() {
  try {
    const raw = localStorage.getItem(DATA_KEY);
    if (raw) {
      const d = JSON.parse(raw);
      return {
        settings: { ...DEFAULT_SETTINGS, ...d.settings },
        students: d.students || [],
        teachers: d.teachers || [],
        registrations: d.registrations || [],
      };
    }
  } catch {
    /* ignore corrupted data */
  }
  return seed();
}

const Ctx = createContext(null);
export const useStore = () => useContext(Ctx);

export function StoreProvider({ children }) {
  const [data, setData] = useState(load);
  const [isAuth, setAuth] = useState(() => localStorage.getItem(AUTH_KEY) === '1');

  useEffect(() => {
    localStorage.setItem(DATA_KEY, JSON.stringify(data));
  }, [data]);

  const api = useMemo(
    () => ({
      add: (col, item) => setData((d) => ({ ...d, [col]: [{ ...item, id: uid() }, ...d[col]] })),
      update: (col, id, patch) =>
        setData((d) => ({ ...d, [col]: d[col].map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
      remove: (col, id) =>
        setData((d) => {
          const next = { ...d, [col]: d[col].filter((x) => x.id !== id) };
          if (col === 'students') next.registrations = d.registrations.filter((r) => r.studentId !== id);
          return next;
        }),
      setSettings: (patch) => setData((d) => ({ ...d, settings: { ...d.settings, ...patch } })),
      replaceAll: (obj) =>
        setData({
          settings: { ...DEFAULT_SETTINGS, ...obj.settings },
          students: obj.students || [],
          teachers: obj.teachers || [],
          registrations: obj.registrations || [],
        }),
      clearRecords: () => setData((d) => ({ ...d, students: [], teachers: [], registrations: [] })),
    }),
    []
  );

 const auth = useCallback(
  async (user, pass) => {
    try {
      const res = await login(user, pass);
      console.log(res);

      if (res) {
        localStorage.setItem(AUTH_KEY, '1');
        setAuth(true);
        return true;
      }

      return false;
    } catch (error) {
      console.error("Login failed:");
      return false;
    }
  },
  []
);

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_KEY);
    setAuth(false);
  }, []);

  return <Ctx.Provider value={{ ...data, ...api, isAuth, auth, logout }}>{children}</Ctx.Provider>;
}
