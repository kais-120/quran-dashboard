import { useState } from 'react';
import StudentRegistrations from './registrations/StudentRegistrations.jsx';
import TeacherPayments from './registrations/TeacherPayments.jsx';

const TABS = [
  { key: 'students', label: 'التلاميذ' },
  { key: 'teachers', label: 'المعلّمون' },
];

export default function Registrations() {
  const [tab, setTab] = useState('students');

  return (
    <>
      <div
        role="tablist"
        style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid #e2e8f0', marginBottom: '1rem' }}
      >
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.key)}
              style={{
                padding: '0.6rem 1.25rem',
                background: 'none',
                border: 'none',
                borderBottom: active ? '3px solid #2b6cb0' : '3px solid transparent',
                color: active ? '#2b6cb0' : 'inherit',
                fontWeight: active ? 700 : 500,
                cursor: 'pointer',
                fontSize: '1rem',
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'students' ? <StudentRegistrations /> : <TeacherPayments />}
    </>
  );
}

