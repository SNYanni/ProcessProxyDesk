const { app, BrowserWindow, ipcMain, shell } = require("electron");
const { execFile } = require("node:child_process");
const { existsSync, readFileSync, writeFileSync, mkdirSync } = require("node:fs");
const http = require("node:http");
const { join } = require("node:path");
const { applyEngine, coreStatus, diagnose, startCore, stopCore } = require("./engine.cjs");

const isDev = !app.isPackaged;

const defaultConfig = {
  engineEnabled: false,
  engineMode: "tun",
  dnsMode: "system",
  killSwitch: true,
  startWithWindows: false,
  minimizeToTray: true,
  proxies: [
    { id: "proxy-hk", name: "HK SOCKS", type: "SOCKS5", host: "127.0.0.1", port: 1080, username: "", password: "", latency: 24, enabled: true },
    { id: "proxy-us", name: "US HTTPS", type: "HTTPS", host: "127.0.0.1", port: 7890, username: "", password: "", latency: 86, enabled: true }
  ],
  rules: [
    { id: "rule-browser", processName: "chrome.exe", proxyId: "proxy-hk", strategy: "proxy", enabled: true, notes: "Browser rule" },
    { id: "rule-chat", processName: "slack.exe", proxyId: "proxy-us", strategy: "proxy", enabled: false, notes: "Work chat fallback" }
  ]
};

let trafficState = {
  startedAt: null,
  byProcess: new Map(),
  lastConnections: new Map()
};

function configPath() {
  const dir = join(app.getPath("userData"), "config");
  mkdirSync(dir, { recursive: true });
  return join(dir, "settings.json");
}

function normalizeConfig(config) {
  return { ...defaultConfig, ...config, engineMode: "tun" };
}

function readConfig() {
  const file = configPath();
  if (!existsSync(file)) {
    writeFileSync(file, JSON.stringify(defaultConfig, null, 2), "utf8");
    return defaultConfig;
  }
  try {
    return normalizeConfig(JSON.parse(readFileSync(file, "utf8")));
  } catch {
    return defaultConfig;
  }
}

function saveConfig(config) {
  const next = normalizeConfig(config);
  writeFileSync(configPath(), JSON.stringify(next, null, 2), "utf8");
  return next;
}

function parseTaskList(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^(.+?)\s+(\d+)\s+(.+?)\s+(\d+)\s+(.+)$/);
      if (!match) return null;
      return {
        name: match[1].trim(),
        pid: Number(match[2]),
        session: match[3].trim(),
        memory: match[5].trim(),
        path: ""
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name));
}

function listProcessesByCim() {
  const script = "Get-CimInstance Win32_Process | Select-Object Name,ProcessId,ExecutablePath,WorkingSetSize | ConvertTo-Json -Compress";
  return new Promise((resolve) => {
    execFile("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script], { windowsHide: true }, (error, stdout) => {
      if (error || !stdout.trim()) {
        resolve(null);
        return;
      }
      try {
        const parsed = JSON.parse(stdout);
        const rows = (Array.isArray(parsed) ? parsed : [parsed])
          .filter((item) => item && item.Name && item.ProcessId)
          .map((item) => ({
            name: item.Name,
            pid: Number(item.ProcessId),
            session: "",
            memory: item.WorkingSetSize ? `${Math.round(Number(item.WorkingSetSize) / 1024).toLocaleString()} K` : "",
            path: item.ExecutablePath || ""
          }))
          .sort((a, b) => a.name.localeCompare(b.name));
        resolve(rows);
      } catch {
        resolve(null);
      }
    });
  });
}

function listProcesses() {
  return new Promise(async (resolve) => {
    const cimRows = await listProcessesByCim();
    if (cimRows?.length) {
      resolve(cimRows);
      return;
    }
    execFile("tasklist.exe", ["/FO", "TABLE", "/NH"], { windowsHide: true }, (error, stdout) => {
      if (error) {
        resolve([]);
        return;
      }
      resolve(parseTaskList(stdout));
    });
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1240,
    height: 820,
    minWidth: 1020,
    minHeight: 680,
    title: "ProcessProxy Desk",
    backgroundColor: "#eef2f6",
    webPreferences: {
      preload: join(__dirname, "../preload/preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  win.setMenuBarVisibility(false);
  win.setAutoHideMenuBar(true);

  if (isDev) {
    win.loadURL("http://127.0.0.1:5173");
  } else {
    win.loadFile(join(__dirname, "../../dist/renderer/index.html"));
  }
}

function corePath() {
  if (app.isPackaged) {
    return join(process.resourcesPath, "app.asar.unpacked", "vendor", "mihomo", "mihomo-windows-amd64-v1.exe");
  }
  return join(app.getAppPath(), "vendor", "mihomo", "mihomo-windows-amd64-v1.exe");
}

function readJson(url) {
  return new Promise((resolve) => {
    const request = http.get(url, { timeout: 1500 }, (response) => {
      let body = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => {
        body += chunk;
      });
      response.on("end", () => {
        try {
          resolve({ ok: response.statusCode >= 200 && response.statusCode < 300, data: JSON.parse(body) });
        } catch {
          resolve({ ok: false, data: null });
        }
      });
    });
    request.on("error", () => resolve({ ok: false, data: null }));
    request.on("timeout", () => {
      request.destroy();
      resolve({ ok: false, data: null });
    });
  });
}

function basename(filePath) {
  return String(filePath || "").split(/[\\/]/).filter(Boolean).pop() || "";
}

function connectionProcessName(connection) {
  const metadata = connection.metadata || {};
  return metadata.process || basename(metadata.processPath) || metadata.processPath || "unknown.exe";
}

function connectionProxy(connection) {
  const chains = Array.isArray(connection.chains) ? connection.chains : [];
  return chains.length ? chains.join(" / ") : "DIRECT";
}

function isProxied(proxy) {
  const value = String(proxy || "").trim().toUpperCase();
  return Boolean(value && value !== "DIRECT" && value !== "REJECT");
}

function resetTrafficState() {
  trafficState = {
    startedAt: new Date().toISOString(),
    byProcess: new Map(),
    lastConnections: new Map()
  };
}

function updateTrafficAccumulator(rows) {
  const seen = new Set();

  for (const connection of rows) {
    const id = connection.id || `${connectionProcessName(connection)}-${connection.start || ""}-${connection.metadata?.destinationIP || ""}-${connection.metadata?.destinationPort || ""}`;
    seen.add(id);
    const processName = connectionProcessName(connection);
    const proxy = connectionProxy(connection);
    const upload = Number(connection.upload || 0);
    const download = Number(connection.download || 0);
    const previous = trafficState.lastConnections.get(id);
    const uploadDelta = previous ? Math.max(upload - previous.upload, 0) : upload;
    const downloadDelta = previous ? Math.max(download - previous.download, 0) : download;
    const current = trafficState.byProcess.get(processName) || {
      processName,
      proxy,
      proxied: isProxied(proxy),
      upload: 0,
      download: 0,
      connections: 0,
      destinations: new Set()
    };
    current.upload += uploadDelta;
    current.download += downloadDelta;
    current.proxy = proxy;
    current.proxied = isProxied(proxy);
    const metadata = connection.metadata || {};
    const destination = metadata.host || metadata.destinationIP || metadata.remoteDestination || "";
    if (destination) current.destinations.add(destination);
    trafficState.byProcess.set(processName, current);
    trafficState.lastConnections.set(id, { upload, download });
  }

  for (const id of Array.from(trafficState.lastConnections.keys())) {
    if (!seen.has(id)) trafficState.lastConnections.delete(id);
  }
}

async function trafficSnapshot() {
  const status = coreStatus();
  if (!status.running) {
    return { ok: false, running: false, processes: [], totalUpload: 0, totalDownload: 0, connectionCount: 0, startedAt: trafficState.startedAt };
  }

  const result = await readJson("http://127.0.0.1:9097/connections");
  if (!result.ok || !result.data) {
    return { ok: false, running: true, processes: [], totalUpload: 0, totalDownload: 0, connectionCount: 0, startedAt: trafficState.startedAt };
  }

  const rows = result.data.connections || [];
  updateTrafficAccumulator(rows);

  const activeCounts = new Map();
  for (const connection of rows) {
    const processName = connectionProcessName(connection);
    activeCounts.set(processName, (activeCounts.get(processName) || 0) + 1);
  }

  const processes = Array.from(trafficState.byProcess.values())
    .map((item) => ({
      processName: item.processName,
      proxy: item.proxy,
      proxied: item.proxied,
      upload: item.upload,
      download: item.download,
      connections: activeCounts.get(item.processName) || 0,
      destinations: Array.from(item.destinations).slice(0, 3)
    }))
    .sort((a, b) => (b.upload + b.download) - (a.upload + a.download));

  return {
    ok: true,
    running: true,
    processes,
    totalUpload: processes.reduce((sum, item) => sum + item.upload, 0),
    totalDownload: processes.reduce((sum, item) => sum + item.download, 0),
    connectionCount: rows.length,
    startedAt: trafficState.startedAt,
    updatedAt: new Date().toISOString()
  };
}

app.whenReady().then(() => {
  ipcMain.handle("config:read", () => readConfig());
  ipcMain.handle("config:save", (_event, config) => saveConfig(config));
  ipcMain.handle("process:list", () => listProcesses());
  ipcMain.handle("engine:diagnose", (_event, config) => diagnose(normalizeConfig(config), corePath()));
  ipcMain.handle("engine:apply", async (_event, config) => {
    const saved = saveConfig(config);
    return applyEngine(saved, app.getPath("userData"), corePath());
  });
  ipcMain.handle("core:status", () => coreStatus());
  ipcMain.handle("core:start", async (_event, config) => {
    const saved = saveConfig({ ...config, engineEnabled: true, engineMode: "tun" });
    const result = await startCore(saved, app.getPath("userData"), corePath());
    if (result.ok) resetTrafficState();
    return result;
  });
  ipcMain.handle("core:stop", () => {
    const current = readConfig();
    saveConfig({ ...current, engineEnabled: false });
    resetTrafficState();
    return stopCore();
  });
  ipcMain.handle("traffic:snapshot", () => trafficSnapshot());
  ipcMain.handle("app:openConfig", () => shell.openPath(configPath()));

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
