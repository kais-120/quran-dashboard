const express = require('express');
const { periods, pdfBuilder,summary } = require('../controllers/ReportController');

const router = express.Router();

// GET /api/reports/periods -> { years: [{ year: 2026, months: [9, 10] }, ...] }
router.get('/periods', periods);

router.get('/summary', summary);


// GET /api/reports/pdf?year=2026&month=10&cur=د.ت&title=...   (month optional)
router.get('/pdf', pdfBuilder);



module.exports = router;