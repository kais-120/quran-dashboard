export const fmtDate = (d) => (d ? d.split('-').reverse().join('/') : '—');

export const age = (d) => {
  if (!d) return '—';
  const b = new Date(d);
  const n = new Date();
  let a = n.getFullYear() - b.getFullYear();
  const m = n.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && n.getDate() < b.getDate())) a--;
  return a >= 0 ? `${a} سنة` : '—';
};

export const money = (n, currency = '') =>
  `${Number(n || 0).toLocaleString('en-US')} ${currency}`.trim();

export const regStatus = (r) => {
  const fee = Number(r.fee || 0);
  const paid = Number(r.paid || 0);
  if (fee === 0 || paid >= fee) return 'paid';
  return paid > 0 ? 'partial' : 'unpaid';
};

export const STATUS_LABEL = {
  paid: 'مدفوع',
  partial: 'جزئي',
  unpaid: 'غير مدفوع',
};

export const todayISO = () => new Date().toISOString().slice(0, 10);
