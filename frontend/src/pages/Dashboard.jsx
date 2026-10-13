import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useStore } from '../store.jsx';
import { getDashboard } from '../services/api';
import { fmtDate, money } from '../utils.js';

export default function Dashboard() {
  // currency is not returned by the API, so keep reading it from the store
  const cur = useStore().settings?.currency;

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => (await getDashboard()).data, // Axios -> unwrap .data
  });

  if (isLoading) return <p className="empty">جارٍ التحميل…</p>;

  if (isError) {
    return (
      <div className="panel">
        <p className="empty">
          {error?.response?.data?.message || 'تعذر تحميل لوحة التحكم'}{' '}
          <button type="button" onClick={() => refetch()}>إعادة المحاولة</button>
        </p>
      </div>
    );
  }

  const {
    settings,
    counts,
    absences,
    finance,
    upcomingActivities = [],
    latestPayments = [],
    latestExpenses = [],
    latestDonations = [],
  } = data;

  return (
    <>
      <div className="welcome">
        <h1>{settings.associationName}</h1>
        <p>السنة الدراسية {settings.schoolYear}</p>
      </div>

      <section className="ledger" aria-label="ملخص">
        <div><b>{counts.students}</b><span>تلميذ</span></div>
        <div><b>{counts.teachers}</b><span>معلم</span></div>
        <div><b>{counts.groups}</b><span>فوج</span></div>
        <div><b>{counts.subscriptions}</b><span>اشتراك</span></div>
        <div><b>{counts.courses}</b><span>دورة</span></div>
        <div><b>{counts.activities}</b><span>نشاط</span></div>
        <div><b>{absences.today}</b><span>غيابات اليوم ({absences.month} هذا الشهر)</span></div>
        <div><b>{money(finance.paid, cur)}</b><span>محصّل هذا الشهر من أصل {money(finance.due, cur)}</span></div>
        <div><b>{money(finance.expenses, cur)}</b><span>مصاريف هذا الشهر</span></div>
        <div><b>{money(finance.teacherPayments, cur)}</b><span>أجور المعلمين هذا الشهر</span></div>
        <div><b>{money(finance.donations, cur)}</b><span>تبرعات هذا الشهر</span></div>
        <div><b>{money(finance.balance, cur)}</b><span>رصيد هذا الشهر</span></div>
      </section>

      <div className="grid-2">
        <section className="panel">
          <h2>النشاطات القادمة</h2>
          {upcomingActivities.length === 0 ? (
            <p className="empty">لا توجد نشاطات قادمة. <Link to="/activities">أضف نشاطًا</Link></p>
          ) : (
            <ul className="recent">
              {upcomingActivities.map((a) => (
                <li key={a.id}>
                  <span>{a.name}</span>
                  <span className="muted num">{fmtDate(a.start_date)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel">
          <h2>تحصيل اشتراكات هذا الشهر</h2>
          <div
            className="meter"
            role="progressbar"
            aria-valuenow={finance.collectionRate}
            aria-valuemin="0"
            aria-valuemax="100"
          >
            <i style={{ width: `${finance.collectionRate}%` }} />
          </div>
          <p className="meter-label">
            تم تحصيل {finance.collectionRate}% — المتبقي {money(finance.remaining, cur)}
          </p>

          <h2 className="sub">آخر الدفعات</h2>
          {latestPayments.length === 0 ? (
            <p className="empty">لا توجد دفعات. <Link to="/subscriptions">سجّل دفعة</Link></p>
          ) : (
            <ul className="recent">
              {latestPayments.map((p) => (
                <li key={p.id}>
                  <span>{p.studentName || '—'}</span>
                  <span style={{textAlign:"right"}} className="muted num">{new Date(p.date).toLocaleDateString()}</span>
                  <b className="num">{money(p.amount, cur)}</b>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel">
          <h2>آخر المصاريف</h2>
          {latestExpenses.length === 0 ? (
            <p className="empty">لا توجد مصاريف. <Link to="/expenses">أضف مصروفًا</Link></p>
          ) : (
            <ul className="recent">
              {latestExpenses.map((e) => (
                <li key={e.id}>
                  <span>{e.title}</span>
                  <span className="muted num">{fmtDate(e.date)}</span>
                  <b className="num">{money(e.amount, cur)}</b>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel">
          <h2>آخر التبرعات</h2>
          {latestDonations.length === 0 ? (
            <p className="empty">لا توجد تبرعات. <Link to="/donations">أضف تبرعًا</Link></p>
          ) : (
            <ul className="recent">
              {latestDonations.map((d) => (
                <li key={d.id}>
                  <span>{d.donor || 'متبرع مجهول'}</span>
                  <span className="muted num">{fmtDate(d.date)}</span>
                  {d.kind === 'money' ? (
                    <b className="num">{money(d.amount, cur)}</b>
                  ) : (
                    <span>{d.item}{d.quantity ? ` ×${d.quantity}` : ''}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}