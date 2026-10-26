const { getPeriods, buildReportPdf, getSummary } = require("../services/reportService");

function parsePeriod(req, res) {
  const year = parseInt(req.query.year, 10);
  const month = req.query.month ? parseInt(req.query.month, 10) : null;

  if (!year || year < 2000 || year > 2100) {
    res.status(400).json({ message: 'سنة غير صالحة' });
    return null;
  }
  if (month !== null && (month < 1 || month > 12)) {
    res.status(400).json({ message: 'شهر غير صالح' });
    return null;
  }
  return { year, month };
}

exports.periods =  async (req, res) => {
  try {
    res.json(await getPeriods());
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'تعذر تحميل الفترات' });
  }
};

exports.summary =  async (req, res) => {
  const p = parsePeriod(req, res);
  if (!p) return;
  try {
    res.json(await getSummary(p.year, p.month));
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'تعذر تحميل الملخص' });
  }
};

exports.pdfBuilder = async (req, res) => {
  const p = parsePeriod(req, res);
  if (!p) return;
  try {
    const pdf = await buildReportPdf({
      year: p.year,
      month: p.month,
      title: String(req.query.title || '').slice(0, 150),
      cur: String(req.query.cur || '').slice(0, 10),
    });

    const name = `report-${p.year}${p.month ? '-' + String(p.month).padStart(2, '0') : ''}.pdf`;
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${name}"`,
      'Content-Length': pdf.length,
    });
    res.end(pdf);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'تعذر إنشاء التقرير' });
  }
}