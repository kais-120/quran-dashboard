const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("logoApi", {
    get: () => ipcRenderer.invoke("get-logo"),
    set: (url) => ipcRenderer.invoke("set-logo", url),
    onChange: (cb) => ipcRenderer.on("logo-changed", (_, url) => cb(url)),
});