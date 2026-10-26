const { google } = require("googleapis");
const crypto = require("crypto");
const fs = require("fs");
const { GoogleToken } = require("../models/Backup");

const FOLDER_NAME = "Backups";
const SCOPE = "https://www.googleapis.com/auth/drive.file";

// ---------- token encryption (AES-256-GCM) ----------
const getKey = () => {
  const key = Buffer.from(process.env.TOKEN_ENC_KEY || "", "hex");
  if (key.length !== 32) throw new Error("TOKEN_ENC_KEY must be 32 bytes (64 hex chars)");
  return key;
};

const encrypt = (text) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv);
  const enc = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), enc].map((b) => b.toString("base64")).join(".");
};

const decrypt = (payload) => {
  const [iv, tag, enc] = payload.split(".").map((p) => Buffer.from(p, "base64"));
  const decipher = crypto.createDecipheriv("aes-256-gcm", getKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
};

// ---------- signed OAuth state (links the browser callback to the user) ----------
const sign = (payload) =>
  crypto.createHmac("sha256", getKey()).update(payload).digest("base64url");

const makeState = (userId) => {
  const payload = Buffer.from(
    JSON.stringify({ userId, exp: Date.now() + 10 * 60 * 1000 })
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
};

const readState = (state) => {
  const [payload, sig] = String(state || "").split(".");
  if (!payload || !sig) throw new Error("Invalid state");
  const expected = sign(payload);
  if (
    sig.length !== expected.length ||
    !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
  ) {
    throw new Error("Invalid state");
  }
  const { userId, exp } = JSON.parse(Buffer.from(payload, "base64url").toString());
  if (Date.now() > exp) throw new Error("State expired");
  return userId;
};

// ---------- Google client ----------
const newOAuthClient = () =>
  new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI // e.g. http://localhost:5000/backup/google/callback
  );

const driveFor = (refreshToken, accessToken) => {
  const client = newOAuthClient();
  client.setCredentials({ refresh_token: refreshToken, access_token: accessToken });
  return google.drive({ version: "v3", auth: client });
};

// ---------- public API ----------
function buildAuthUrl(userId) {
  return newOAuthClient().generateAuthUrl({
    access_type: "offline",
    prompt: "consent", // always returns a refresh token
    scope: [SCOPE],
    state: makeState(userId),
  });
}


async function connectUser(userId, code) {
  const client = newOAuthClient();
  const { tokens } = await client.getToken(code);

  const existing = await GoogleToken.findOne({
    where: { user_id: userId },
  });

  const refreshToken =
    tokens.refresh_token ||
    (existing ? decrypt(existing.refresh_token) : null);

  if (!refreshToken) {
    throw new Error("No refresh token received");
  }

  let email = existing?.email || null;

  try {
    const drive = driveFor(refreshToken, tokens.access_token);
    const about = await drive.about.get({
      fields: "user(emailAddress)",
    });

    email = about.data.user?.emailAddress || email;
  } catch (err) {
    // Email is optional.
  }

  const values = {
    user_id: userId,
    refresh_token: encrypt(refreshToken),
    email,
    folder_id: existing?.folder_id || null,
  };

  if (existing) {
    await existing.update(values);
  } else {
    await GoogleToken.create(values);
  }
}


async function disconnectUser(userId) {
  const row = await GoogleToken.findOne({ where: { user_id:userId } });
  if (!row) return;
  try {
    await newOAuthClient().revokeToken(decrypt(row.refresh_token));
  } catch (e) {
    // already revoked or network issue, still remove locally
  }
  await row.destroy();
}


async function ensureFolder(drive, row) {
  if (row.folder_id) {
    return row.folder_id;
  }

  const { data } = await drive.files.create({
    requestBody: {
      name: FOLDER_NAME,
      mimeType: "application/vnd.google-apps.folder",
    },
    fields: "id",
  });

  await row.update({ folder_id: data.id });

  return data.id;
}

async function uploadFile(userId, filePath, fileName, retry = true) {
  const row = await GoogleToken.findOne({ where: { user_id:userId } });
  if (!row) throw new Error("Google Drive not connected");

  const drive = driveFor(decrypt(row.refresh_token));
  try {
    const folderId = await ensureFolder(drive, row);
    await drive.files.create({
      requestBody: { name: fileName, parents: [folderId] },
      media: { mimeType: "application/gzip", body: fs.createReadStream(filePath) },
      fields: "id",
    });
    await row.update({ last_upload_at: new Date() });
  } catch (err) {
    const msg = String(err?.response?.data?.error || err?.message || "");
    // User revoked access from their Google account
    if (msg.includes("invalid_grant")) {
      await row.destroy();
      throw new Error("Google access revoked, please reconnect");
    }
    // Folder was deleted by the user: recreate once
    if (err?.code === 404 && retry) {
        await row.update({ folder_id: null });
        return uploadFile(userId, filePath, fileName, false);
        }
    throw err;
  }
}

const getConnectedUserIds = async () =>
  (await GoogleToken.findAll({ attributes: ["user_id"] })).map((r) => r.user_id);

module.exports = {
  buildAuthUrl,
  readState,
  connectUser,
  disconnectUser,
  uploadFile,
  getConnectedUserIds,
};