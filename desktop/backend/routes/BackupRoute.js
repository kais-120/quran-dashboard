const express = require("express");
const router = express.Router();
const backupController = require("../controllers/BackupController");


router.get("/status", backupController.getBackupStatus);
router.get("/history",  backupController.getBackupHistory);
router.post("/run-now", backupController.runBackupNow);

module.exports = router;