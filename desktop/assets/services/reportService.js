const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const { QueryTypes } = require('sequelize');
const sequelize = require('../config/db');

// ---- match your site's palette here (copy from your CSS variables) ----
const THEME = {
  primary: '#1f6f4a',
  primarySoft: '#eef5f0',
  border: '#d9e3dc',
  text: '#1c2a22',
  muted: '#667',
  cardBg: '#f6faf7',
};

// adjust to your real tables / columns
const STUDENT_NAME = "CONCAT(name)";
const TEACHER_NAME = "CONCAT(t.first_name, ' ', t.last_name)";

const MONTHS = [
  'جانفي', 'فيفري', 'مارس', 'أفريل', 'ماي', 'جوان',
  'جويلية', 'أوت', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];

const q = (sql, replacements) =>
  sequelize.query(sql, { replacements, type: QueryTypes.SELECT });

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));

const num = (v) => Number(v || 0);
const fmt = (v) => num(v).toFixed(3);

/* ---------------------------------------------------------------
   1) Periods that actually exist in the database (PostgreSQL)
---------------------------------------------------------------- */
async function getPeriods() {
  const rows = await q(
    `SELECT y, m FROM (
       SELECT CAST(EXTRACT(YEAR FROM date) AS integer) AS y,
              CAST(EXTRACT(MONTH FROM date) AS integer) AS m
         FROM donations
       UNION
       SELECT CAST(EXTRACT(YEAR FROM date) AS integer),
              CAST(EXTRACT(MONTH FROM date) AS integer)
         FROM expenses
       UNION
       SELECT CAST(year AS integer), CAST(month AS integer)
         FROM subscription_payment
       UNION
       SELECT CAST(year AS integer), CAST(month AS integer)
         FROM teacher_payment
     ) t
     WHERE y IS NOT NULL AND m BETWEEN 1 AND 12
     ORDER BY y DESC, m ASC`
  );

  const map = new Map();
  for (const r of rows) {
    const y = Number(r.y);
    if (!map.has(y)) map.set(y, new Set());
    map.get(y).add(Number(r.m));
  }
  return {
    years: [...map.entries()].map(([year, set]) => ({
      year,
      months: [...set].sort((a, b) => a - b),
    })),
  };
}

/* ---------------------------------------------------------------
   2) Report data
---------------------------------------------------------------- */
async function loadData(year, month) {
  const r = month ? { y: year, m: month } : { y: year };
  const mSp = month ? 'AND CAST(sp.month AS integer) = :m' : '';
  const mTp = month ? 'AND CAST(tp.month AS integer) = :m' : '';
  const mDate = month ? 'AND EXTRACT(MONTH FROM date) = :m' : '';

  const [subs, teachers, expenses, donations] = await Promise.all([
    q(
      `SELECT sp.amount, sp.status, CAST(sp.month AS integer) AS m,
              to_char(sp.date_payment, 'YYYY-MM-DD') AS d,
              ${STUDENT_NAME} AS name
         FROM subscription_payment sp
         JOIN subscriptions s ON s.id = sp.subscription_id
         JOIN students st ON st.id = s.student_id
        WHERE CAST(sp.year AS integer) = :y ${mSp}
        ORDER BY sp.date_payment`,
      r
    ),
    q(
      `SELECT tp.amount, CAST(tp.month AS integer) AS m,
              to_char(tp.date_payment, 'YYYY-MM-DD') AS d,
              ${TEACHER_NAME} AS name
         FROM teacher_payment tp
         JOIN teachers t ON t.id = tp.teacher_id
        WHERE CAST(tp.year AS integer) = :y ${mTp}
        ORDER BY tp.date_payment`,
      r
    ),
    q(
      `SELECT title, amount,
              CAST(EXTRACT(MONTH FROM date) AS integer) AS m,
              to_char(date, 'YYYY-MM-DD') AS d, note
         FROM expenses
        WHERE EXTRACT(YEAR FROM date) = :y ${mDate}
        ORDER BY date`,
      r
    ),
    q(
      `SELECT donor_type, donor_name, kind, amount, item, quantity,
              CAST(EXTRACT(MONTH FROM date) AS integer) AS m,
              to_char(date, 'YYYY-MM-DD') AS d
         FROM donations
        WHERE EXTRACT(YEAR FROM date) = :y ${mDate}
        ORDER BY date`,
      r
    ),
  ]);

  return { subs, teachers, expenses, donations };
}

function summarize({ subs, teachers, expenses, donations }) {
  const sum = (arr) => arr.reduce((t, x) => t + num(x.amount), 0);
  const moneyDon = donations.filter((d) => d.kind === 'money');

  const paid = sum(subs);
  const donationsTotal = sum(moneyDon);
  const expensesTotal = sum(expenses);
  const teachersTotal = sum(teachers);

  const income = paid + donationsTotal;
  const outgoing = expensesTotal + teachersTotal;

  const by = {};
  const add = (m, k, v) => {
    const key = Number(m);
    by[key] = by[key] || { paid: 0, donations: 0, expenses: 0, teachers: 0 };
    by[key][k] += num(v);
  };
  subs.forEach((x) => add(x.m, 'paid', x.amount));
  moneyDon.forEach((x) => add(x.m, 'donations', x.amount));
  expenses.forEach((x) => add(x.m, 'expenses', x.amount));
  teachers.forEach((x) => add(x.m, 'teachers', x.amount));

  return {
    paid, donationsTotal, expensesTotal, teachersTotal,
    income, outgoing, balance: income - outgoing, by,
  };
}

// light version used by the page preview
async function getSummary(year, month) {
  const { by, ...totals } = summarize(await loadData(year, month));
  return totals;
}

/* ---------------------------------------------------------------
   3) HTML
---------------------------------------------------------------- */
function fontCss() {
  const dir = path.join(__dirname, '..', 'assets', 'fonts');
  const face = (file, weight) => {
    try {
      const b64 = fs.readFileSync(path.join(dir, file)).toString('base64');
      return `@font-face{font-family:'Cairo';font-weight:${weight};src:url(data:font/ttf;base64,${b64}) format('truetype');}`;
    } catch {
      return '';
    }
  };
  return face('Cairo-Regular.ttf', 400) + face('Cairo-Bold.ttf', 700);
}

const table = (headers, rows, empty) =>
  rows.length === 0
    ? `<p class="empty">${esc(empty)}</p>`
    : `<table>
         <thead><tr>${headers.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead>
         <tbody>${rows
           .map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`)
           .join('')}</tbody>
       </table>`;

function buildHtml({ year, month, title, cur }, data, s) {
  const money = (v) => `${fmt(v)} ${cur}`;
  const periodLabel = month ? `${MONTHS[month - 1]} ${year}` : `سنة ${year}`;
  const kind = month ? 'تقرير شهري' : 'تقرير سنوي';

  const card = (label, value, cls = '') =>
    `<div class="card ${cls}"><span>${esc(label)}</span><b>${esc(money(value))}</b></div>`;

  const breakdown = month
    ? ''
    : `<h2>التفصيل الشهري</h2>` +
      table(
        ['الشهر', 'الاشتراكات', 'التبرعات', 'المصاريف', 'أجور المعلمين', 'الرصيد'],
        Object.keys(s.by)
          .map(Number)
          .sort((a, b) => a - b)
          .map((m) => {
            const x = s.by[m];
            return [
              MONTHS[m - 1],
              fmt(x.paid),
              fmt(x.donations),
              fmt(x.expenses),
              fmt(x.teachers),
              fmt(x.paid + x.donations - x.expenses - x.teachers),
            ];
          }),
        'لا توجد بيانات'
      );

  const details = !month
    ? ''
    : `
      <h2>دفعات الاشتراكات</h2>
      ${table(
        ['التاريخ', 'التلميذ', 'الحالة', 'المبلغ'],
        data.subs.map((p) => [p.d, p.name, p.status === 'pay' ? 'مكتمل' : 'جزئي', fmt(p.amount)]),
        'لا توجد دفعات'
      )}
      <h2>التبرعات</h2>
      ${table(
        ['التاريخ', 'المتبرع', 'النوع', 'القيمة'],
        data.donations.map((d) => [
          d.d,
          d.donor_type === 'anonymous' ? 'متبرع مجهول' : d.donor_name || '—',
          d.kind === 'money' ? 'مالي' : 'عيني',
          d.kind === 'money' ? fmt(d.amount) : `${d.item || ''}${d.quantity ? ` ×${d.quantity}` : ''}`,
        ]),
        'لا توجد تبرعات'
      )}
      <h2>المصاريف</h2>
      ${table(
        ['التاريخ', 'البيان', 'ملاحظة', 'المبلغ'],
        data.expenses.map((e) => [e.d, e.title, e.note || '—', fmt(e.amount)]),
        'لا توجد مصاريف'
      )}
      <h2>أجور المعلمين</h2>
      ${table(
        ['التاريخ', 'المعلم', 'المبلغ'],
        data.teachers.map((t) => [t.d, t.name, fmt(t.amount)]),
        'لا توجد أجور'
      )}`;

  return `<!doctype html>
<html lang="ar" dir="rtl"><head><meta charset="utf-8"><style>
  ${fontCss()}
  *{box-sizing:border-box}
  body{font-family:'Cairo',sans-serif;color:${THEME.text};font-size:12px;margin:0}
  .head{border-bottom:3px solid ${THEME.primary};padding-bottom:8px;margin-bottom:14px}
  .head h1{margin:0;font-size:22px;color:${THEME.primary}}
  .head p{margin:2px 0 0;color:${THEME.muted}}
  .cards{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:10px}
  .card{border:1px solid ${THEME.border};border-radius:8px;padding:8px 10px;background:${THEME.cardBg}}
  .card span{display:block;color:${THEME.muted};font-size:11px}
  .card b{font-size:14px}
  .card.total{background:${THEME.primary};color:#fff;border-color:${THEME.primary}}
  .card.total span{color:#e6f4ec}
  h2{font-size:14px;margin:16px 0 6px;color:${THEME.primary};break-after:avoid}
  table{width:100%;border-collapse:collapse}
  th,td{border:1px solid ${THEME.border};padding:5px 7px;text-align:right}
  th{background:${THEME.primarySoft}}
  tr{break-inside:avoid}
  .empty{color:#889;margin:4px 0}
</style></head><body>
  <div class="head">
    <h1>${esc(title || 'تقرير الجمعية')}</h1>
    <p>${kind} — ${esc(periodLabel)}</p>
  </div>
  <div class="cards">
    ${card('اشتراكات محصّلة', s.paid)}
    ${card('تبرعات مالية', s.donationsTotal)}
    ${card('إجمالي المداخيل', s.income)}
    ${card('مصاريف', s.expensesTotal)}
    ${card('أجور المعلمين', s.teachersTotal)}
    ${card('الرصيد', s.balance, 'total')}
  </div>
  ${breakdown}
  ${details}
</body></html>`;
}

/* ---------------------------------------------------------------
   4) PDF (one shared browser)
---------------------------------------------------------------- */
let browserPromise = null;
function getBrowser() {
  if (!browserPromise) {
    browserPromise = puppeteer
      .launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] })
      .then((b) => {
        b.on('disconnected', () => { browserPromise = null; });
        return b;
      })
      .catch((e) => { browserPromise = null; throw e; });
  }
  return browserPromise;
}

async function buildReportPdf({ year, month, title = '', cur = '' }) {
  const data = await loadData(year, month);
  const summary = summarize(data);
  const html = buildHtml({ year, month, title, cur }, data, summary);

  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: 'load' });
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '15mm', bottom: '18mm', left: '12mm', right: '12mm' },
      displayHeaderFooter: true,
      headerTemplate: '<span></span>',
      footerTemplate:
        '<div style="font-size:9px;width:100%;text-align:center;color:#889">' +
        '<span class="pageNumber"></span> / <span class="totalPages"></span></div>',
    });
    return Buffer.from(pdf);
  } finally {
    await page.close();
  }
}

module.exports = { getPeriods, getSummary, buildReportPdf };