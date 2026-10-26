const express = require("express");
const router = express.Router();
const { getDashboard } = require("../controllers/DashboardController");
// const auth = require("../middleware/auth"); // add your auth middleware if you have one

// GET /api/dashboard
router.get("/", getDashboard);

module.exports = router;