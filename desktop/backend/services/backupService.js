// backupService.js
// Hourly automatic backup that only saves a new backup when data actually changed.
// Requires: npm install node-cron googleapis

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const cron = require('node-cron');
const { google } = require('googleapis');

// ---------------------------------------------------------------------------
// CONFIG - adjust these to match your setup
// ---------------------------------------------------------------------------
const DB_CONFIG = {
  host: process.env.HOSTDB,
  port: process.env.PORTDB,
  user: process.env.USERNAMEDB,
  password: process.env.PASSWORDDB,
  database: process.env.DATABASE,
};

const LOCAL_BACKUP_DIR = path.join(__dirname, '../backups');
const PG_DUMP_PATH = process.env.PG_DUMP_PATH;
const STATE_FILE = path.join(LOCAL_BACKUP_DIR, '.last_backup_hash.json');
// NEW: tiny sidecar file that records the outcome of the last Drive upload,
// since nothing else in this file was tracking that. Doesn't touch your
// existing dump/hash/prune logic at all.
const DRIVE_STATE_FILE = path.join(LOCAL_BACKUP_DIR, '.last_drive_upload.json');
const MAX_LOCAL_BACKUPS = 30; // keep last 30 (roughly a month if hourly-but-only-on-change)
const MAX_DRIVE_BACKUPS = 30;

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;
const GOOGLE_DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || 'YOUR_FOLDER_ID_HERE';

// Ensure local backup folder exists
if (!fs.existsSync(LOCAL_BACKUP_DIR)) {
  fs.mkdirSync(LOCAL_BACKUP_DIR, { recursive: true });
}

// ---------------------------------------------------------------------------
// 1. Dump the database to a .sql file using pg_dump
// ---------------------------------------------------------------------------
function dumpDatabase(outputPath) {
  return new Promise((resolve, reject) => {
    const cmd = `"${PG_DUMP_PATH}" -h ${DB_CONFIG.host} -p ${DB_CONFIG.port} -U ${DB_CONFIG.user} -d ${DB_CONFIG.database} -F p -f "${outputPath}"`;
    exec(cmd, { env: { ...process.env, PGPASSWORD: DB_CONFIG.password } }, (error, stdout, stderr) => {
      if (error) {
        return reject(new Error(`pg_dump failed: ${stderr || error.message}`));
      }
      resolve(outputPath);
    });
  });
}

// ---------------------------------------------------------------------------
// 2. Hash the dump content so we can detect "is there new data?"
// ---------------------------------------------------------------------------
function hashFile(filePath) {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

function getLastHash() {
  if (!fs.existsSync(STATE_FILE)) return null;
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8')).hash;
  } catch {
    return null;
  }
}

function saveLastHash(hash) {
  fs.writeFileSync(STATE_FILE, JSON.stringify({ hash, updatedAt: new Date().toISOString() }));
}

// NEW: read/write helpers for the Drive upload sidecar file.
function getDriveState() {
  if (!fs.existsSync(DRIVE_STATE_FILE)) return { lastUploadAt: null, uploadedFileNames: [] };
  try {
    return JSON.parse(fs.readFileSync(DRIVE_STATE_FILE, 'utf-8'));
  } catch {
    return { lastUploadAt: null, uploadedFileNames: [] };
  }
}

function recordDriveUpload(fileName) {
  const state = getDriveState();
  state.lastUploadAt = new Date().toISOString();
  state.uploadedFileNames = [...(state.uploadedFileNames || []), fileName].slice(-MAX_DRIVE_BACKUPS);
  fs.writeFileSync(DRIVE_STATE_FILE, JSON.stringify(state, null, 2));
}

// ---------------------------------------------------------------------------
// 3. Google Drive upload
// ---------------------------------------------------------------------------
async function getDriveClient() {
  const oAuth2Client = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);
  oAuth2Client.setCredentials({ refresh_token: GOOGLE_REFRESH_TOKEN });
  return google.drive({ version: 'v3', auth: oAuth2Client });
}

async function uploadToDrive(filePath, fileName) {
  const drive = await getDriveClient();
  const res = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [GOOGLE_DRIVE_FOLDER_ID],
    },
    media: {
      mimeType: 'application/sql',
      body: fs.createReadStream(filePath),
    },
    fields: 'id',
  });
  return res.data.id;
}

async function pruneDriveBackups() {
  const drive = await getDriveClient();
  const res = await drive.files.list({
    q: `'${GOOGLE_DRIVE_FOLDER_ID}' in parents and trashed = false`,
    fields: 'files(id, name, createdTime)',
    orderBy: 'createdTime desc',
  });
  const files = res.data.files || [];
  const toDelete = files.slice(MAX_DRIVE_BACKUPS);
  for (const file of toDelete) {
    await drive.files.delete({ fileId: file.id });
  }
}

// NEW: cheap connectivity check for the frontend's "Google Drive: Connecté /
// Non connecté" card. Doesn't change any existing upload/prune behavior.
async function isGoogleDriveConnected() {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN) {
    return false;
  }
  try {
    const oAuth2Client = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);
    oAuth2Client.setCredentials({ refresh_token: GOOGLE_REFRESH_TOKEN });
    await oAuth2Client.getAccessToken();
    return true;
  } catch {
    return false;
  }
}

async function getLastDriveUploadDate() {
  return getDriveState().lastUploadAt;
}

async function getUploadedFileNames() {
  return getDriveState().uploadedFileNames || [];
}

// ---------------------------------------------------------------------------
// 4. Local pruning
// ---------------------------------------------------------------------------
function pruneLocalBackups() {
  const files = fs
    .readdirSync(LOCAL_BACKUP_DIR)
    .filter((f) => f.endsWith('.sql'))
    .map((f) => ({ name: f, time: fs.statSync(path.join(LOCAL_BACKUP_DIR, f)).mtime.getTime() }))
    .sort((a, b) => b.time - a.time);

  const toDelete = files.slice(MAX_LOCAL_BACKUPS);
  for (const file of toDelete) {
    fs.unlinkSync(path.join(LOCAL_BACKUP_DIR, file.name));
  }
}

// ---------------------------------------------------------------------------
// 5. Main check-and-backup routine (this is what cron calls every hour)
// ---------------------------------------------------------------------------
async function checkAndBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const tempPath = path.join(LOCAL_BACKUP_DIR, `_temp_${timestamp}.sql`);

  try {
    console.log(`[Backup] Checking for changes at ${new Date().toLocaleString()}...`);
    await dumpDatabase(tempPath);

    const currentHash = hashFile(tempPath);
    const lastHash = getLastHash();

    if (currentHash === lastHash) {
      console.log('[Backup] No new data since last backup — skipping.');
      fs.unlinkSync(tempPath);
      return { skipped: true };
    }

    // Data changed — keep this backup
    const finalName = `galaxy_gym_backup_${timestamp}.sql`;
    const finalPath = path.join(LOCAL_BACKUP_DIR, finalName);
    fs.renameSync(tempPath, finalPath);

    saveLastHash(currentHash);
    pruneLocalBackups();

    console.log('[Backup] New data detected — saved locally:', finalName);

    // Upload to Google Drive
    try {
      await uploadToDrive(finalPath, finalName);
      await pruneDriveBackups();
      recordDriveUpload(finalName); // NEW
      console.log('[Backup] Uploaded to Google Drive successfully.');
    } catch (driveErr) {
      console.error('[Backup] Google Drive upload failed (local backup still saved):', driveErr.message);
    }

    return { skipped: false, file: finalName };
  } catch (err) {
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    console.error('[Backup] Backup failed:', err.message);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// 6. Schedule: run every hour, check for changes, back up only if changed
// ---------------------------------------------------------------------------
function startBackupCron() {
  // '0 * * * *' = at minute 0 of every hour
  cron.schedule('0 * * * *', () => {
    checkAndBackup().catch(() => {});
  });
  console.log('[Backup] Hourly change-check cron started.');
}

module.exports = {
  checkAndBackup, // exposed so you can also call this from a manual "Sauvegarder maintenant" button
  startBackupCron,
  // NEW exports — additive only, nothing above this line changed behavior:
  LOCAL_BACKUP_DIR,
  MAX_LOCAL_BACKUPS,
  isGoogleDriveConnected,
  getLastDriveUploadDate,
  getUploadedFileNames,
};