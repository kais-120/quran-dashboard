const express = require("express");
const router = express.Router()
const { googleCallback, backupStatus, backupHistory, backupRunNow, backupGoogleConnect, backupGoogleDisconnect, googleAuthUrl, restoreUpload, restoreById } = require("../controllers/BackupController");
const AuthenticateToken = require("../middleware/AuthenticateToken");

const multer = require("multer");
const fs = require("fs");
const { TMP_DIR } = require("../services/backupService");

fs.mkdirSync(TMP_DIR, { recursive: true });
const upload = multer({
  dest: TMP_DIR,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500 MB
});



router.get("/google/callback",googleCallback )

router.get("/status",AuthenticateToken,backupStatus);

router.get("/history",backupHistory);

router.get("/google/auth-url", AuthenticateToken,googleAuthUrl);

router.post("/run-now",AuthenticateToken,backupRunNow);

router.post("/google/connect",AuthenticateToken,backupGoogleConnect);

router.post("/google/disconnect",AuthenticateToken ,backupGoogleDisconnect);

router.post("/restore/upload", AuthenticateToken, upload.single("file"), restoreUpload);
router.post("/restore/:id", AuthenticateToken, restoreById);

module.exports = router;