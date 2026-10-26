const express = require('express');
const { getPeriods, buildReportPdf } = require('../services/reportService');

const router = express.Router();

// GET /api/reports/periods -> { years: [{ year: 2026, months: [9, 10] }, ...] }
router.get('/periods', async (req, res) => {
  try {
    res.json(await getPeriods());
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'تعذر تحميل الفترات' });
  }
});

// GET /api/reports/pdf?year=2026&month=10&cur=د.ت&title=...   (month optional)
router.get('/pdf', pde);

module.exports = router;