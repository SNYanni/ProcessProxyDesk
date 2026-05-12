const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("processProxy", {
  readConfig: () => ipcRenderer.invoke("config:read"),
  saveConfig: (config) => ipcRenderer.invoke("config:save", config),
  listProcesses: () => ipcRenderer.invoke("process:list"),
  diagnoseEngine: (config) => ipcRenderer.invoke("engine:diagnose", config),
  applyEngine: (config) => ipcRenderer.invoke("engine:apply", config),
  coreStatus: () => ipcRenderer.invoke("core:status"),
  startCore: (config) => ipcRenderer.invoke("core:start", config),
  stopCore: () => ipcRenderer.invoke("core:stop"),
  trafficSnapshot: () => ipcRenderer.invoke("traffic:snapshot"),
  openConfig: () => ipcRenderer.invoke("app:openConfig")
});
