const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const { spawn } = require("child_process");
const { pipeline } = require("stream/promises");
const cron = require("node-cron");
const sequelize = require("../config/db");
const drive = require("./googleDrive");
const { BackupLog } = require("../models/Backup");

const BACKUP_DIR = path.join(__dirname, "..", "backups");
const SAFETY_DIR = path.join(BACKUP_DIR, "pre-restore");
const TMP_DIR = path.join(BACKUP_DIR, "tmp");
const RETENTION = Number(process.env.BACKUP_RETENTION || 30);
const SAFETY_RETENTION = 5;
const EXT = ".sql.gz";

let isRunning = false; // shared lock: backup or restore

const stamp = () => new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);

function dbArgs() {
  const { host, port, username, database } = sequelize.config;
  return ["-h", host || "localhost", "-p", String(port || 5432), "-U", username, "-d", database];
}

function dbEnv() {
  return { ...process.env, PGPASSWORD: sequelize.config.password || "" };
}

// pg_dump -> gzip -> file (credentials come from your Sequelize config)
function dumpDatabase(filePath) {
  const child = spawn("pg_dump", [...dbArgs(), "--no-owner", "--clean", "--if-exists"], {
    env: dbEnv(),
  });

  let stderr = "";
  child.stderr.on("data", (d) => (stderr += d));

  const exited = new Promise((resolve, reject) => {
    child.on("error", (e) =>
      reject(
        e.code === "ENOENT"
          ? new Error("pg_dump not found. Install postgresql-client on the server.")
          : e
      )
    );
    child.on("close", (code) =>
      code === 0 ? resolve() : reject(new Error(`pg_dump failed (${code}): ${stderr.trim()}`))
    );
  });

  const written = new Promise((resolve, reject) => {
    const out = fs.createWriteStream(filePath);
    out.on("error", reject);
    out.on("finish", resolve);
    child.stdout.pipe(zlib.createGzip()).pipe(out);
  });

  return Promise.all([exited, written]);
}

// file (.sql.gz or plain .sql) -> psql, all in one transaction (all or nothing)
function isGzip(filePath) {
  const fd = fs.openSync(filePath, "r");
  const buf = Buffer.alloc(2);
  fs.readSync(fd, buf, 0, 2, 0);
  fs.closeSync(fd);
  return buf[0] === 0x1f && buf[1] === 0x8b;
}

function psqlRestore(filePath) {
  const child = spawn(
    "psql",
    [...dbArgs(), "-q", "-v", "ON_ERROR_STOP=1", "--single-transaction"],
    { env: dbEnv() }
  );

  let stderr = "";
  child.stderr.on("data", (d) => (stderr += d));
  child.stdin.on("error", () => {}); // psql may exit early (EPIPE); the close handler reports why

  const exited = new Promise((resolve, reject) => {
    child.on("error", (e) =>
      reject(
        e.code === "ENOENT"
          ? new Error("psql not found. Install postgresql-client on the server.")
          : e
      )
    );
    child.on("close", (code) =>
      code === 0 ? resolve() : reject(new Error(`psql failed (${code}): ${stderr.trim()}`))
    );
  });

  const source = fs.createReadStream(filePath);
  const feed = isGzip(filePath)
    ? pipeline(source, zlib.createGunzip(), child.stdin)
    : pipeline(source, child.stdin);

  return Promise.all([exited, feed.catch(() => {})]);
}

function pruneDir(dir, keep) {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir)
    .filter((f) => f.endsWith(EXT))
    .map((f) => ({ f, t: fs.statSync(path.join(dir, f)).mtimeMs }))
    .sort((a, b) => b.t - a.t)
    .slice(keep)
    .forEach(({ f }) => fs.unlinkSync(path.join(dir, f)));
}

function applyRetention() {
  pruneDir(BACKUP_DIR, RETENTION);
}

// userIds: users whose Google Drive should receive the file
async function runBackup(userIds = []) {
  console.log("[backup] userIds:", userIds);
  if (isRunning) throw new Error("A backup or restore is already running");
  isRunning = true;

  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const filename = `backup-${stamp()}${EXT}`;
  const filePath = path.join(BACKUP_DIR, filename);
  const log = await BackupLog.create({ filename, status: "running" });

  try {
    await dumpDatabase(filePath);
    await log.update({ size: fs.statSync(filePath).size });

    let uploaded = false;
    const driveErrors = [];
    for (const userId of userIds) {
      try {
        await drive.uploadFile(userId, filePath, filename);
        uploaded = true;
      } catch (e) {
        driveErrors.push(`user ${userId}: ${e.message}`);
      }
    }

    await log.update({
      status: "success",
      uploaded_to_drive: uploaded,
      error: driveErrors.length ? driveErrors.join("\n") : null,
    });
    applyRetention();
    return log;
  } catch (err) {
    fs.rmSync(filePath, { force: true }); // remove partial file
    await log.update({ status: "error", error: err.message });
    throw err;
  } finally {
    isRunning = false;
  }
}

// Core restore. Takes a safety dump first so a bad restore can be undone by hand.
async function restoreFromPath(filePath) {
  if (isRunning) throw new Error("A backup or restore is already running");
  isRunning = true;

  try {
    if (!fs.existsSync(filePath)) throw new Error("Backup file not found");

    fs.mkdirSync(SAFETY_DIR, { recursive: true });
    const safetyFile = path.join(SAFETY_DIR, `pre-restore-${stamp()}${EXT}`);
    try {
      await dumpDatabase(safetyFile);
    } catch (e) {
      fs.rmSync(safetyFile, { force: true });
      throw new Error(`Safety backup failed, restore aborted: ${e.message}`);
    }

    // Single transaction: if anything fails, the database stays untouched.
    await psqlRestore(filePath);

    pruneDir(SAFETY_DIR, SAFETY_RETENTION);
    console.log("[restore] done. Safety copy:", safetyFile);
    return { safetyFile: path.basename(safetyFile) };
  } finally {
    isRunning = false;
  }
}

// Restore from a backup_logs row, using the local file or the user's Drive copy.
// NOTE: log lookup happens BEFORE restoring, because the restore replaces backup_logs too.
async function restoreFromLog(logId, source, userId) {
  const log = await BackupLog.findByPk(logId);
  if (!log) throw new Error("Backup not found");
  if (log.status !== "success") throw new Error("This backup is not valid for restore");

  const filename = path.basename(log.filename); // prevent path traversal
  const localPath = path.join(BACKUP_DIR, filename);

  if (source === "drive") {
    fs.mkdirSync(TMP_DIR, { recursive: true });
    const tmpPath = path.join(TMP_DIR, `drive-${stamp()}-${filename}`);
    try {
      await drive.downloadFile(userId, filename, tmpPath); // see note above
      return await restoreFromPath(tmpPath);
    } finally {
      fs.rmSync(tmpPath, { force: true });
    }
  }

  return restoreFromPath(localPath);
}

// Restore from an uploaded file (multer temp path). The temp file is always removed.
async function restoreFromUpload(tmpPath) {
  try {
    return await restoreFromPath(tmpPath);
  } finally {
    fs.rmSync(tmpPath, { force: true });
  }
}

async function getLocalStats() {
  if (!fs.existsSync(BACKUP_DIR)) return { count: 0, size: 0 };
  const files = fs.readdirSync(BACKUP_DIR).filter((f) => f.endsWith(EXT));
  const size = files.reduce((s, f) => s + fs.statSync(path.join(BACKUP_DIR, f)).size, 0);
  return { count: files.length, size };
}

// Daily at 02:00, uploads to every connected user's Drive
function startScheduler() {
  cron.schedule(process.env.BACKUP_CRON || "0 2 * * *", async () => {
    try {
      await runBackup(await drive.getConnectedUserIds());
    } catch (e) {
      console.error("Scheduled backup failed:", e.message);
    }
  });
}

module.exports = {
  runBackup,
  restoreFromLog,
  restoreFromUpload,
  getLocalStats,
  startScheduler,
  RETENTION,
  TMP_DIR,
};