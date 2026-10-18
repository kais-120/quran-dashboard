const { app, BrowserWindow, dialog, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");
const logo = require("./logo-manager");

const logFile = path.join(app.getPath("userData"), "app.log");
function log(...args) {
    const line = `[${new Date().toISOString()}] ${args.join(" ")}\n`;
    fs.appendFileSync(logFile, line);
    console.log(...args);
}

// catch anything unhandled in the main process
process.on("uncaughtException", (err) => {
    log("UNCAUGHT EXCEPTION:", err.stack || err.message);
    dialog.showErrorBox("Startup error", err.message);
});

let backend;
let win;

function getBackendDir() {
    if (app.isPackaged) {
        return path.join(process.resourcesPath, "app.asar.unpacked", "backend");
    }
    return path.join(__dirname, "backend");
}

function startBackend() {
    try {
        const backendDir = getBackendDir();
        log("Backend dir:", backendDir);

        process.chdir(backendDir);
        require(path.join(backendDir, "server.js"));

        log("Backend started OK");
    } catch (err) {
        log("BACKEND START FAILED:");
        log(err.stack || err.message);
    }
}

// apply the current logo to the window (and dock on macOS) and notify the UI
function applyLogo() {
    try {
        const img = logo.getLogoImage();
        if (win && !win.isDestroyed()) {
            win.setIcon(img);
            win.webContents.send("logo-changed", logo.getLogoUrl());
        }
        if (process.platform === "darwin" && app.dock) app.dock.setIcon(img);
    } catch (err) {
        log("APPLY LOGO FAILED:", err.stack || err.message);
    }
}

// periodic check against the remote server (optional)
async function checkLogo() {
    try {
        if (await logo.syncLogo()) {
            log("Logo updated from server");
            applyLogo();
        }
    } catch (err) {
        log("LOGO SYNC FAILED:", err.message);
    }
}

function createWindow() {
    try {
        win = new BrowserWindow({
            width: 1400,
            height: 900,
            icon: logo.getLogoImage(),
            webPreferences: {
                preload: path.join(__dirname, "preload.js"),
                devTools: false,
                contextIsolation: true,
                nodeIntegration: false,
            },
        });

        win.webContents.on("did-fail-load", (e, code, desc) => {
            log("PAGE LOAD FAILED:", code, desc);
        });

        // Block DevTools shortcuts
        win.webContents.on("before-input-event", (event, input) => {
            if (
                input.key === "F12" ||
                (input.control && input.shift && input.key.toLowerCase() === "i") ||
                (input.control && input.shift && input.key.toLowerCase() === "j")
            ) {
                event.preventDefault();
            }
        });

        // Disable right-click context menu
        win.webContents.on("context-menu", (event) => {
            event.preventDefault();
        });

        const indexPath = path.join(__dirname, "./frontend/index.html");
        log("Loading frontend from:", indexPath, "exists:", fs.existsSync(indexPath));
        win.loadFile(indexPath);
    } catch (err) {
        log("WINDOW CREATION FAILED:", err.stack || err.message);
    }
}

app.whenReady().then(() => {
    ipcMain.handle("get-logo", () => logo.getLogoUrl());

    // called by the Settings page right after the logo is saved
    ipcMain.handle("set-logo", async (_event, url) => {
        try {
            if (typeof url !== "string" || !/^https?:\/\//i.test(url)) {
                throw new Error("Invalid logo URL");
            }
            await logo.setLogoFromUrl(url);
            log("Logo updated from Settings:", url);
            applyLogo();
            return true;
        } catch (err) {
            log("SET LOGO FAILED:", err.stack || err.message);
            return false;
        }
    });

    startBackend();
    createWindow();

    // check remote server on startup, then every 30 minutes
    checkLogo();
    setInterval(checkLogo, 30 * 60 * 1000);
});

app.on("window-all-closed", () => {
    if (backend) backend.kill();
    app.quit();
});