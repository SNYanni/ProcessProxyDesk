/// <reference types="vite/client" />

type ProxyType = "HTTP" | "HTTPS" | "SOCKS5";
type RuleStrategy = "proxy" | "direct" | "block";

interface ProxyProfile {
  id: string;
  name: string;
  type: ProxyType;
  host: string;
  port: number;
  username: string;
  password: string;
  latency: number;
  enabled: boolean;
}

interface ProcessRule {
  id: string;
  processName: string;
  proxyId: string;
  strategy: RuleStrategy;
  enabled: boolean;
  notes: string;
}

interface AppConfig {
  engineEnabled: boolean;
  engineMode: "tun";
  dnsMode: "system" | "proxy" | "secure";
  killSwitch: boolean;
  startWithWindows: boolean;
  minimizeToTray: boolean;
  proxies: ProxyProfile[];
  rules: ProcessRule[];
}

interface RunningProcess {
  name: string;
  pid: number;
  session: string;
  memory: string;
  path: string;
}

interface EngineCheck {
  id: string;
  label: string;
  ok: boolean;
  detail: string;
}

interface EngineDiagnostics {
  elevated: boolean;
  coreInstalled: boolean;
  validationIssues: string[];
  checks: EngineCheck[];
}

interface CoreStatus {
  ok?: boolean;
  running: boolean;
  pid: number | null;
  startedAt: string | null;
  rulesPath?: string;
  coreConfigPath?: string;
  diagnostics?: EngineDiagnostics;
  message?: string;
}

interface TrafficProcess {
  processName: string;
  proxy: string;
  proxied: boolean;
  upload: number;
  download: number;
  uploadRate?: number;
  downloadRate?: number;
  connections: number;
  destinations: string[];
}

interface TrafficSnapshot {
  ok: boolean;
  running: boolean;
  processes: TrafficProcess[];
  totalUpload: number;
  totalDownload: number;
  totalUploadRate?: number;
  totalDownloadRate?: number;
  connectionCount: number;
  startedAt?: string;
  updatedAt?: string;
}

interface Window {
  processProxy: {
    readConfig: () => Promise<AppConfig>;
    saveConfig: (config: AppConfig) => Promise<AppConfig>;
    listProcesses: () => Promise<RunningProcess[]>;
    diagnoseEngine: (config: AppConfig) => Promise<EngineDiagnostics>;
    applyEngine: (config: AppConfig) => Promise<{ ok: boolean; rulesPath: string; coreConfigPath: string; diagnostics: EngineDiagnostics; message: string }>;
    coreStatus: () => Promise<CoreStatus>;
    startCore: (config: AppConfig) => Promise<CoreStatus>;
    stopCore: () => Promise<CoreStatus>;
    trafficSnapshot: () => Promise<TrafficSnapshot>;
    openConfig: () => Promise<string>;
  };
}
