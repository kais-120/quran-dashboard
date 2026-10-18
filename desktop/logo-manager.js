const { app, nativeImage } = require("electron");
const { pathToFileURL } = require("url");
const fs = require("fs");
const path = require("path");

const SERVER = "http://localhost:5000/api/v1/uploads"; // returns { version, url }
const customLogo = () => path.join(app.getPath("userData"), "logo.png");
const metaFile = () => path.join(app.getPath("userData"), "logo.json");
const defaultLogo = path.join(__dirname, "assets", "logo.png");

function getLogoPath() {
    return fs.existsSync(customLogo()) ? customLogo() : defaultLogo;
}

function getLogoUrl() {
    return pathToFileURL(getLogoPath()).href + "?t=" + Date.now();
}

function getVersion() {
    try {
        return JSON.parse(fs.readFileSync(metaFile(), "utf8")).version;
    } catch {
        return null;
    }
}

async function downloadTo(url, version) {
    const img = await fetch(url);
    if (!img.ok) throw new Error(`Download failed: ${img.status}`);
    fs.writeFileSync(customLogo(), Buffer.from(await img.arrayBuffer()));
    fs.writeFileSync(metaFile(), JSON.stringify({ version }));
}

// used by Settings: download this exact URL and make it the logo
async function setLogoFromUrl(url) {
    await downloadTo(url, "local-" + Date.now());
}

// returns true if the logo changed (remote server check)
async function syncLogo() {
    const res = await fetch(SERVER);
    if (!res.ok) return false;
    const { version, url } = await res.json();
    if (version === getVersion()) return false;

    await downloadTo(url, version);
    return true;
}

function getLogoImage() {
    return nativeImage.createFromPath(getLogoPath());
}

module.exports = { syncLogo, setLogoFromUrl, getLogoPath, getLogoUrl, getLogoImage };