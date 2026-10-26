const { BackupLog, GoogleToken } = require("../models/Backup");
const backup = require("../services/backupService");
const drive = require("../services/googleDrive");

const resultPage = (ok) => `<!doctype html>
<html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>Google Drive</title>
<style>body{font-family:sans-serif;display:grid;place-items:center;height:100vh;margin:0;background:#f5f5f5}
div{background:#fff;padding:32px 40px;border-radius:12px;text-align:center;box-shadow:0 2px 12px #0002}</style></head>
<body><div><h2>${ok ? "✅ تم ربط Google Drive بنجاح" : "❌ فشل ربط Google Drive"}</h2>
<p>${ok ? "يمكنك إغلاق هذه النافذة والعودة إلى التطبيق." : "أغلق هذه النافذة وحاول مرة أخرى من التطبيق."}</p></div></body></html>`;

exports.googleCallback = async (req, res) => {
  const { code, state, error, error_description } = req.query;

  if (error || !code) {
    console.error("Google OAuth error:", {
      error,
      error_description,
      hasCode: Boolean(code),
      hasState: Boolean(state),
    });

    return res.status(400).send(resultPage(false));
  }

  try {
    const userId = drive.readState(state);

    console.log("Google callback: state validated");

    await drive.connectUser(userId, code);

    console.log("Google Drive connected successfully");

    return res.send(resultPage(true));
  } catch (err) {
    console.error("Google Drive callback failed:", {
      message: err.message,
      response: err.response?.data,
      code: err.code,
    });

    return res.status(500).send(resultPage(false));
  }
};

// GET /backup/status
exports.backupStatus = async (req, res) => {
  try {
    const last = await BackupLog.findOne({ order: [["createdAt", "DESC"]] });
    const token = await GoogleToken.findOne({ where: { user_id: req.userId } });
    const local = await backup.getLocalStats();

    res.json({
      lastBackupAt: last?.createdAt || null,
      lastBackupStatus: last?.status || null,
      localCount: local.count,
      localTotalSize: local.size,
      retentionCount: backup.RETENTION,
      googleDriveConnected: !!token,
      googleEmail: token?.email || null,
      lastDriveUploadAt: token?.last_upload_at || null,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Failed to load status" });
  }
};
// GET /backup/google/auth-url  -> { url } to open in the system browser

exports.googleAuthUrl =  (req, res) => {
  try {
    res.json({ url: drive.buildAuthUrl(req.userId) });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Failed to build Google URL" });
  }
};

// GET /backup/history
exports.backupHistory =  async (req, res) => {
  try {
    const rows = await BackupLog.findAll({ order: [["createdAt", "DESC"]], limit: 50 });
    res.json(
      rows.map((r) => ({
        id: r.id,
        createdAt: r.createdAt,
        size: Number(r.size),
        status: r.status,
        uploaded_to_drive: r.uploaded_to_drive,
      }))
    );
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Failed to load history" });
  }
};

// POST /backup/run-now  (uploads to the current user's Drive if connected)
exports.backupRunNow = async (req, res) => {
  try {
    const connected = await GoogleToken.findOne({ where: { user_id: req.userId} });
    await backup.runBackup(connected ? [req.userId] : []);
    res.json({ ok: true });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: err.message });
  }
};

// POST /backup/google/connect  { code }
exports.backupGoogleConnect = async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ message: "Missing code" });
  try {
    await drive.connectUser(req.userId, code);
    res.json({ ok: true });
  } catch (err) {
    console.log(err?.response?.data || err);
    if (err.code === "NO_REFRESH_TOKEN") {
      return res.status(400).json({
        message:
          "No refresh token received. Remove the app at myaccount.google.com/permissions then try again.",
      });
    }
    res.status(500).json({ message: "Failed to connect Google Drive" });
  }
};

// POST /backup/google/disconnect
exports.backupGoogleDisconnect = async (req, res) => {
  try {
    await drive.disconnectUser(req.userId);
    res.json({ ok: true });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Failed to disconnect" });
  }
};

exports.restoreById = async (req, res) => {
  try {
    const source = req.body?.source === "drive" ? "drive" : "local";
    const result = await backup.restoreFromLog(req.params.id, source, req.userId);
    res.json({ message: "تمت استعادة البيانات بنجاح.", ...result });
  } catch (err) {
    console.error("[restore]", err.message);
    res.status(500).json({ message: err.message });
  }
};

exports.restoreUpload = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "لم يتم رفع أي ملف." });
  try {
    const result = await backup.restoreFromUpload(req.file.path);
    res.json({ message: "تمت استعادة البيانات بنجاح.", ...result });
  } catch (err) {
    console.error("[restore upload]", err.message);
    res.status(500).json({ message: err.message });
  }
};