import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useStore } from '../store.jsx';
import { getReportPeriods, getReportSummary, downloadReportPdf } from '../services/api';
import { money } from '../utils.js';

const MONTHS = [
  'جانفي', 'فيفري', 'مارس', 'أفريل', 'ماي', 'جوان',
  'جويلية', 'أوت', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];

export default function Reports() {
  const settings = useStore().settings;
  const cur = settings?.currency;

  const [mode, setMode] = useState('year'); // 'year' | 'month'
  const [year, setYear] = useState('');
  const [month, setMonth] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const periods = useQuery({
    queryKey: ['report-periods'],
    queryFn: async () => (await getReportPeriods()).data,
  });

  const years = periods.data?.years || [];
  const selYear = year || String(years[0]?.year || '');
  const months = years.find((y) => String(y.year) === selYear)?.months || [];
  const selMonth =
    mode === 'month' ? (months.includes(Number(month)) ? Number(month) : months[0]) : null;

  const summary = useQuery({
    queryKey: ['report-summary', selYear, selMonth],
    queryFn: async () =>
      (await getReportSummary({ year: selYear, month: selMonth || undefined })).data,
    enabled: !!selYear && (mode === 'year' || !!selMonth),
  });

  const download = async () => {
    setBusy(true);
    setErr('');
    try {
      const res = await downloadReportPdf({
        year: selYear,
        month: selMonth || undefined,
        cur,
        title: settings?.associationName,
      });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `تقرير-${selYear}${selMonth ? '-' + String(selMonth).padStart(2, '0') : ''}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setErr('تعذر إنشاء التقرير');
    } finally {
      setBusy(false);
    }
  };

  if (periods.isLoading) return <p className="empty">جارٍ التحميل…</p>;

  if (periods.isError) {
    return (
      <div className="panel">
        <p className="empty">
          {periods.error?.response?.data?.message || 'تعذر تحميل الفترات'}{' '}
          <button type="button" onClick={() => periods.refetch()}>إعادة المحاولة</button>
        </p>
      </div>
    );
  }

  const s = summary.data;
  const label = selMonth ? `${MONTHS[selMonth - 1]} ${selYear}` : `سنة ${selYear}`;

  const rows = s
    ? [
        ['اشتراكات محصّلة', s.paid],
        ['تبرعات مالية', s.donationsTotal],
        ['مصاريف', s.expensesTotal],
        ['أجور المعلمين', s.teachersTotal],
      ]
    : [];

  return (
    <>
      <div className="welcome">
        <h1>التقارير</h1>
        <p>{settings?.associationName}</p>
      </div>

      {years.length === 0 ? (
        <section className="panel">
          <p className="empty">لا توجد بيانات لإنشاء تقرير</p>
        </section>
      ) : (
        <div className="grid-2">
          <section className="panel">
            <h2>تحميل تقرير PDF</h2>

            <div className="report-form">
              <div className="field">
                <span>نوع التقرير</span>
                <div className="seg">
                  <button
                    type="button"
                    className={mode === 'year' ? 'on' : ''}
                    onClick={() => setMode('year')}
                  >
                    سنوي
                  </button>
                  <button
                    type="button"
                    className={mode === 'month' ? 'on' : ''}
                    onClick={() => setMode('month')}
                  >
                    شهري
                  </button>
                </div>
              </div>

              <div className="field">
                <span>السنة</span>
                <select
                  value={selYear}
                  onChange={(e) => { setYear(e.target.value); setMonth(''); }}
                >
                  {years.map((y) => (
                    <option key={y.year} value={y.year}>{y.year}</option>
                  ))}
                </select>
              </div>

              {mode === 'month' && (
                <div className="field">
                  <span>الشهر</span>
                  <select value={selMonth || ''} onChange={(e) => setMonth(e.target.value)}>
                    {months.map((m) => (
                      <option key={m} value={m}>{MONTHS[m - 1]}</option>
                    ))}
                  </select>
                </div>
              )}

              <button type="button" className="btn-download" onClick={download} disabled={busy}>
                {busy ? 'جارٍ الإنشاء…' : 'تحميل PDF'}
              </button>
              {err && <p className="empty">{err}</p>}
            </div>
          </section>

          <section className="panel">
            <h2>ملخص {label}</h2>
            {summary.isLoading ? (
              <p className="empty">جارٍ التحميل…</p>
            ) : summary.isError || !s ? (
              <p className="empty">تعذر تحميل الملخص</p>
            ) : (
              <ul className="recent">
                {rows.map(([name, value]) => (
                  <li key={name}>
                    <span>{name}</span>
                    <b className="num">{money(value, cur)}</b>
                  </li>
                ))}
                <li className="total">
                  <span>الرصيد</span>
                  <b className="num">{money(s.balance, cur)}</b>
                </li>
              </ul>
            )}
          </section>
        </div>
      )}
    </>
  );
}