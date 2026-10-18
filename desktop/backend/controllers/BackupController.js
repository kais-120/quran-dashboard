const fs = require("fs");
const path = require("path");
const backupService = require("../services/backupService");

const {
  LOCAL_BACKUP_DIR,
  MAX_LOCAL_BACKUPS,
  checkAndBackup,
  isGoogleDriveConnected,
  getLastDriveUploadDate,
  getUploadedFileNames,
} = backupService;

// Reads the local backup folder and returns file metadata sorted newest-first.
// Matches the naming pattern from backupService.js: galaxy_gym_backup_<timestamp>.sql
const listLocalBackups = () => {
  if (!fs.existsSync(LOCAL_BACKUP_DIR)) return [];

  return fs
    .readdirSync(LOCAL_BACKUP_DIR)
    .filter((fileName) => fileName.endsWith(".sql") && !fileName.startsWith("_temp_"))
    .map((fileName) => {
      const filePath = path.join(LOCAL_BACKUP_DIR, fileName);
      const stats = fs.statSync(filePath);
      return {
        fileName,
        size: stats.size,
        createdAt: stats.mtime,
      };
    })
    .sort((a, b) => b.createdAt - a.createdAt);
};

// GET /backup/status
exports.getBackupStatus = async (req, res) => {
  try {
    const localBackups = listLocalBackups();
    const lastBackup = localBackups[0] || null;
    const localTotalSize = localBackups.reduce((sum, b) => sum + b.size, 0);

    let googleDriveConnected = false;
    let lastDriveUploadAt = null;
    try {
      googleDriveConnected = await isGoogleDriveConnected();
      lastDriveUploadAt = await getLastDriveUploadDate();
    } catch (driveErr) {
      googleDriveConnected = false;
    }

    res.json({
      lastBackupAt: lastBackup ? lastBackup.createdAt : null,
      lastBackupStatus: lastBackup ? "success" : null,
      localCount: localBackups.length,
      localTotalSize,
      retentionCount: MAX_LOCAL_BACKUPS,
      googleDriveConnected,
      lastDriveUploadAt,
    });
  } catch (err) {
    console.error("Erreur lors de la récupération du statut de sauvegarde :", err);
    res.status(500).json({ message: "Impossible de récupérer le statut de sauvegarde." });
  }
};

// GET /backup/history
exports.getBackupHistory = async (req, res) => {
  try {
    const localBackups = listLocalBackups();

    let uploadedFileNames = new Set();
    try {
      uploadedFileNames = new Set(await getUploadedFileNames());
    } catch (driveErr) {
      // History still renders without the Drive chip if this fails.
    }

    const history = localBackups.map((backup) => ({
      id: backup.fileName,
      createdAt: backup.createdAt,
      size: backup.size,
      uploadedToDrive: uploadedFileNames.has(backup.fileName),
      status: "success",
    }));

    res.json(history);
  } catch (err) {
    console.error("Erreur lors de la récupération de l'historique des sauvegardes :", err);
    res.status(500).json({ message: "Impossible de récupérer l'historique des sauvegardes." });
  }
};

// POST /backup/run-now
exports.runBackupNow = async (req, res) => {
  try {
    const result = await checkAndBackup();
    res.json({
      message: result.skipped
        ? "Aucun changement détecté depuis la dernière sauvegarde."
        : "Sauvegarde lancée avec succès.",
      ...result,
    });
  } catch (err) {
    console.error("Erreur lors du lancement de la sauvegarde manuelle :", err);
    res.status(500).json({ message: "La sauvegarde a échoué. Veuillez réessayer." });
  }
};