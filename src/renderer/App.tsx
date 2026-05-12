import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Activity,
  AlertTriangle,
  Ban,
  Check,
  ChevronDown,
  ChevronRight,
  CircleCheck,
  CircleDashed,
  Cpu,
  Database,
  FolderCog,
  Gauge,
  Globe2,
  Plus,
  Power,
  RefreshCw,
  Route,
  Save,
  Search,
  Settings,
  Shield,
  SlidersHorizontal,
  Trash2,
  Wifi
} from "lucide-react";
import "./styles.css";

type TabKey = "overview" | "rules" | "proxies" | "monitor" | "settings";
type NoticeKind = "info" | "success" | "warning" | "error";

const C = {
  appName: "\u8fdb\u7a0b\u4ee3\u7406",
  appSub: "\u6309\u8fdb\u7a0b\u5206\u6d41",
  loading: "\u6b63\u5728\u8bfb\u53d6\u914d\u7f6e...",
  loaded: "\u914d\u7f6e\u5df2\u52a0\u8f7d",
  saved: "\u914d\u7f6e\u5df2\u4fdd\u5b58",
  title: "\u4e3a\u4e0d\u540c\u8f6f\u4ef6\u8fdb\u7a0b\u6307\u5b9a\u4e0d\u540c\u7f51\u7edc\u4ee3\u7406",
  tun: "\u5185\u7f6e TUN / Mihomo",
  start: "\u542f\u52a8\u771f\u5b9e\u5206\u6d41",
  stop: "\u505c\u6b62\u771f\u5b9e\u5206\u6d41",
  stopped: "\u771f\u5b9e\u5206\u6d41\u672a\u542f\u52a8\uff0c\u5f53\u524d\u4e0d\u4f1a\u6539\u53d8\u7cfb\u7edf\u7f51\u7edc\u6d41\u91cf\u3002"
};

const tabs: Array<{ key: TabKey; label: string; icon: React.ReactNode }> = [
  { key: "overview", label: "\u603b\u89c8", icon: <Activity size={18} /> },
  { key: "rules", label: "\u8fdb\u7a0b\u89c4\u5219", icon: <Cpu size={18} /> },
  { key: "proxies", label: "\u4ee3\u7406\u8282\u70b9", icon: <Globe2 size={18} /> },
  { key: "monitor", label: "\u6d41\u91cf\u76d1\u63a7", icon: <Gauge size={18} /> },
  { key: "settings", label: "\u8bbe\u7f6e\u4e0e\u8bca\u65ad", icon: <Settings size={18} /> }
];

const uid = () => Math.random().toString(36).slice(2, 10);

const emptyConfig: AppConfig = {
  engineEnabled: false,
  engineMode: "tun",
  dnsMode: "system",
  killSwitch: true,
  startWithWindows: false,
  minimizeToTray: true,
  proxies: [],
  rules: []
};

const emptyTraffic: TrafficSnapshot = {
  ok: false,
  running: false,
  processes: [],
  totalUpload: 0,
  totalDownload: 0,
  totalUploadRate: 0,
  totalDownloadRate: 0,
  connectionCount: 0
};

function App() {
  const [tab, setTab] = useState<TabKey>("overview");
  const [config, setConfig] = useState<AppConfig>(emptyConfig);
  const [diagnostics, setDiagnostics] = useState<EngineDiagnostics | null>(null);
  const [core, setCore] = useState<CoreStatus>({ running: false, pid: null, startedAt: null });
  const [processes, setProcesses] = useState<RunningProcess[]>([]);
  const [traffic, setTraffic] = useState<TrafficSnapshot>(emptyTraffic);
  const [query, setQuery] = useState("");
  const [selectedProxy, setSelectedProxy] = useState<string>("");
  const [notice, setNotice] = useState(C.loading);
  const [noticeKind, setNoticeKind] = useState<NoticeKind>("info");
  const lastTraffic = useRef<{ snapshot: TrafficSnapshot; time: number } | null>(null);

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    void refreshTraffic();
    const timer = window.setInterval(() => void refreshTraffic(), 1500);
    return () => window.clearInterval(timer);
  }, []);

  async function load() {
    const next = normalizeConfig(await window.processProxy.readConfig());
    setConfig(next);
    setSelectedProxy(next.proxies[0]?.id ?? "");
    showNotice(C.loaded, "success");
    await Promise.all([refreshProcesses(), runDiagnostics(next), refreshCoreStatus(), refreshTraffic()]);
  }

  async function refreshProcesses() {
    setProcesses(await window.processProxy.listProcesses());
  }

  async function runDiagnostics(next = config) {
    setDiagnostics(await window.processProxy.diagnoseEngine(normalizeConfig(next)));
  }

  async function refreshCoreStatus() {
    setCore(await window.processProxy.coreStatus());
  }

  async function refreshTraffic() {
    const raw = await window.processProxy.trafficSnapshot();
    const now = Date.now();
    const prev = lastTraffic.current;
    const elapsed = prev ? Math.max((now - prev.time) / 1000, 0.5) : 1;
    const prevMap = new Map((prev?.snapshot.processes ?? []).map((item) => [item.processName, item]));
    const processesWithRate = raw.processes.map((item) => {
      const old = prevMap.get(item.processName);
      return {
        ...item,
        uploadRate: old ? Math.max((item.upload - old.upload) / elapsed, 0) : 0,
        downloadRate: old ? Math.max((item.download - old.download) / elapsed, 0) : 0
      };
    });
    const snapshot = {
      ...raw,
      processes: processesWithRate,
      totalUploadRate: prev ? Math.max((raw.totalUpload - prev.snapshot.totalUpload) / elapsed, 0) : 0,
      totalDownloadRate: prev ? Math.max((raw.totalDownload - prev.snapshot.totalDownload) / elapsed, 0) : 0
    };
    lastTraffic.current = { snapshot, time: now };
    setTraffic(snapshot);
  }

  async function save(next = config) {
    const saved = normalizeConfig(await window.processProxy.saveConfig(normalizeConfig(next)));
    setConfig(saved);
    showNotice("配置已保存到本地配置文件。启动真实分流时会使用这些设置。", "success");
    await runDiagnostics(saved);
    return saved;
  }

  async function saveAndApply() {
    const saved = await save(config);
    const result = await window.processProxy.applyEngine(saved);
    setDiagnostics(result.diagnostics);
    showNotice(result.ok ? "配置已保存，内核规则也已生成。若真实分流正在运行，请重启一次让新规则完全生效。" : result.message, result.ok ? "success" : "warning");
  }

  async function toggleCore() {
    if (core.running) {
      const result = await window.processProxy.stopCore();
      setCore(result);
      setConfig((current) => ({ ...current, engineEnabled: false }));
      showNotice(result.message ?? "\u771f\u5b9e\u5206\u6d41\u5185\u6838\u5df2\u505c\u6b62", "info");
      await refreshTraffic();
      return;
    }

    const result = await window.processProxy.startCore(normalizeConfig(config));
    setCore(result);
    if (result.diagnostics) setDiagnostics(result.diagnostics);
    if (result.ok) setConfig((current) => ({ ...current, engineEnabled: true, engineMode: "tun" }));
    showNotice(result.message ?? "\u771f\u5b9e\u5206\u6d41\u5185\u6838\u5df2\u542f\u52a8", result.ok ? "success" : "error");
    await refreshTraffic();
  }

  function showNotice(message: string, kind: NoticeKind = "info") {
    setNotice(message);
    setNoticeKind(kind);
  }

  const activeRules = config.rules.filter((rule) => rule.enabled).length;
  const enabledProxies = config.proxies.filter((proxy) => proxy.enabled).length;
  const readyChecks = diagnostics?.checks.filter((item) => item.ok).length ?? 0;
  const totalChecks = diagnostics?.checks.length ?? 3;
  const selectedProxyProfile = config.proxies.find((proxy) => proxy.id === selectedProxy) ?? config.proxies[0];

  const routedProcesses = useMemo(() => {
    const ruleNames = new Set(config.rules.filter((rule) => rule.enabled).map((rule) => rule.processName.toLowerCase()));
    return processes.filter((process) => ruleNames.has(process.name.toLowerCase())).length;
  }, [config.rules, processes]);

  const filteredProcesses = useMemo(() => {
    const text = query.trim().toLowerCase();
    return mergeProcessesByExe(processes)
      .filter((process) => !text || process.name.toLowerCase().includes(text) || String(process.pid).includes(text))
      .slice(0, 80);
  }, [processes, query]);

  function updateRule(id: string, patch: Partial<ProcessRule>) {
    setConfig((current) => ({
      ...current,
      rules: current.rules.map((rule) => (rule.id === id ? { ...rule, ...patch } : rule))
    }));
  }

  function updateProxy(id: string, patch: Partial<ProxyProfile>) {
    setConfig((current) => ({
      ...current,
      proxies: current.proxies.map((proxy) => (proxy.id === id ? { ...proxy, ...patch } : proxy))
    }));
  }

  function addRule(processName = "example.exe") {
    const normalized = processName.trim();
    const exists = config.rules.some((rule) => rule.processName.toLowerCase() === normalized.toLowerCase());
    if (exists) {
      showNotice(`规则已存在：${normalized}。同一个 exe 的不同 PID 会自动共用这条规则。`, "warning");
      setTab("rules");
      return;
    }
    const proxyId = config.proxies[0]?.id ?? "";
    setConfig((current) => ({
      ...current,
      rules: [{ id: `rule-${uid()}`, processName: normalized, proxyId, strategy: "proxy", enabled: true, notes: "" }, ...current.rules]
    }));
    setTab("rules");
  }

  function addRules(processNames: string[]) {
    const proxyId = config.proxies[0]?.id ?? "";
    const existing = new Set(config.rules.map((rule) => rule.processName.toLowerCase()));
    const unique = Array.from(new Set(processNames.map((name) => name.trim()).filter(Boolean)))
      .filter((name) => !existing.has(name.toLowerCase()));
    if (!unique.length) {
      showNotice("应用组里的进程规则都已存在。同一个 exe 的不同 PID 会自动共用同一条规则。", "warning");
      return;
    }
    setConfig((current) => ({
      ...current,
      rules: [
        ...unique.map((processName) => ({
          id: `rule-${uid()}`,
          processName,
          proxyId,
          strategy: "proxy" as RuleStrategy,
          enabled: true,
          notes: "\u5e94\u7528\u7ec4\u89c4\u5219"
        })),
        ...current.rules
      ]
    }));
    setTab("rules");
  }

  function addProxy() {
    const proxy: ProxyProfile = {
      id: `proxy-${uid()}`,
      name: "\u65b0\u4ee3\u7406",
      type: "SOCKS5",
      host: "127.0.0.1",
      port: 1080,
      username: "",
      password: "",
      latency: 0,
      enabled: true
    };
    setConfig((current) => ({ ...current, proxies: [proxy, ...current.proxies] }));
    setSelectedProxy(proxy.id);
  }

  function removeRule(id: string) {
    setConfig((current) => ({ ...current, rules: current.rules.filter((rule) => rule.id !== id) }));
  }

  function removeProxy(id: string) {
    setConfig((current) => {
      const proxies = current.proxies.filter((proxy) => proxy.id !== id);
      return {
        ...current,
        proxies,
        rules: current.rules.map((rule) => (rule.proxyId === id ? { ...rule, proxyId: proxies[0]?.id ?? "" } : rule))
      };
    });
    setSelectedProxy(config.proxies.find((proxy) => proxy.id !== id)?.id ?? "");
  }

  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brandMark"><Route size={22} /></div>
          <div><strong>ProcessProxy</strong><span>{C.appSub}</span></div>
        </div>

        <nav className="nav">
          {tabs.map((item) => (
            <button className={tab === item.key ? "active" : ""} key={item.key} onClick={() => setTab(item.key)}>
              {item.icon}{item.label}
            </button>
          ))}
        </nav>

        <section className="engineCard">
          <div className="engineTop"><Power size={18} /><span>{core.running ? `PID ${core.pid}` : "\u5185\u6838\u5df2\u505c\u6b62"}</span></div>
          <button className={core.running ? "power on" : "power"} onClick={toggleCore}>{core.running ? C.stop : C.start}</button>
        </section>
      </aside>

      <section className="content">
        <header className="topbar">
          <div>
            <p className="eyebrow">{C.tun}</p>
            <h1>{C.title}</h1>
          </div>
          <div className="actions">
            <button className="ghost" onClick={() => window.processProxy.openConfig()}><FolderCog size={17} />{"\u914d\u7f6e\u6587\u4ef6"}</button>
            <button className="ghost" onClick={() => runDiagnostics()}><Shield size={17} />{"\u8fd0\u884c\u8bca\u65ad"}</button>
            <button className="primary" onClick={saveAndApply} title="保存当前配置，并生成 Mihomo 内核使用的规则文件"><Save size={17} />{"保存并应用"}</button>
          </div>
        </header>
        <div className={`noticeBar ${noticeKind}`}><span>{notice}</span></div>

        <section className="page">
          {tab === "overview" && <Overview activeRules={activeRules} enabledProxies={enabledProxies} routedProcesses={routedProcesses} processes={processes.length} core={core} traffic={traffic} readyChecks={readyChecks} totalChecks={totalChecks} diagnostics={diagnostics} notice={notice} />}
          {tab === "rules" && <RulesPage config={config} processes={filteredProcesses} allProcesses={processes} query={query} setQuery={setQuery} refreshProcesses={refreshProcesses} updateRule={updateRule} addRule={addRule} addRules={addRules} removeRule={removeRule} />}
          {tab === "proxies" && <ProxiesPage config={config} selectedProxy={selectedProxy} setSelectedProxy={setSelectedProxy} selectedProxyProfile={selectedProxyProfile} updateProxy={updateProxy} addProxy={addProxy} removeProxy={removeProxy} />}
          {tab === "monitor" && <MonitorPage traffic={traffic} core={core} refreshTraffic={refreshTraffic} />}
          {tab === "settings" && <SettingsPage config={config} setConfig={setConfig} diagnostics={diagnostics} runDiagnostics={runDiagnostics} />}
        </section>

        <footer className="status">
          <Database size={15} />
          <span>{notice}</span>
          {!core.running && <><Ban size={15} /><span>{C.stopped}</span></>}
        </footer>
      </section>
    </main>
  );
}

function Overview({ activeRules, enabledProxies, routedProcesses, processes, core, traffic, readyChecks, totalChecks, diagnostics, notice }: { activeRules: number; enabledProxies: number; routedProcesses: number; processes: number; core: CoreStatus; traffic: TrafficSnapshot; readyChecks: number; totalChecks: number; diagnostics: EngineDiagnostics | null; notice: string }) {
  const totals = trafficTotals(traffic);
  return (
    <div className="pageGrid overviewGrid">
      <Stat icon={<SlidersHorizontal />} label={"\u542f\u7528\u89c4\u5219"} value={activeRules} sub={"\u5df2\u914d\u7f6e\u5206\u6d41\u7b56\u7565"} />
      <Stat icon={<Wifi />} label={"\u53ef\u7528\u4ee3\u7406"} value={enabledProxies} sub={"\u53ef\u7528\u8282\u70b9\u6570"} />
      <Stat icon={<Cpu />} label={"\u547d\u4e2d\u8fdb\u7a0b"} value={routedProcesses} sub={`\u5df2\u626b\u63cf ${processes} \u4e2a\u8fdb\u7a0b`} />
      <Stat icon={<Gauge />} label={"\u771f\u5b9e\u5185\u6838"} value={core.running ? "\u8fd0\u884c" : "\u505c\u6b62"} sub={core.running ? `PID ${core.pid}` : `\u8bca\u65ad ${readyChecks}/${totalChecks}`} />
      <section className="panel wide">
        <div className="panelHead"><div><h2>{"\u5f53\u524d\u6d41\u91cf"}</h2><p>{"\u4ece Mihomo \u672c\u5730\u63a7\u5236\u63a5\u53e3\u8bfb\u53d6"}</p></div></div>
        <div className="trafficCards">
          <Metric label={"\u5b9e\u65f6\u603b\u901f\u7387"} value={<FlowPair down={`${formatBytes(traffic.totalDownloadRate ?? 0)}/s`} up={`${formatBytes(traffic.totalUploadRate ?? 0)}/s`} />} />
          <Metric label={"\u603b\u4e0b\u884c / \u4e0a\u884c"} value={<FlowPair down={formatBytes(totals.total.download)} up={formatBytes(totals.total.upload)} />} />
          <Metric label={"\u4ee3\u7406\u4e0b\u884c / \u4e0a\u884c"} value={<FlowPair down={formatBytes(totals.proxied.download)} up={formatBytes(totals.proxied.upload)} />} />
          <Metric label={"\u76f4\u8fde\u4e0b\u884c / \u4e0a\u884c"} value={<FlowPair down={formatBytes(totals.direct.download)} up={formatBytes(totals.direct.upload)} />} />
        </div>
      </section>
      <section className="panel">
        <div className="panelHead tight"><div><h2>{"\u72b6\u6001"}</h2><p>{notice}</p></div></div>
        <div className="checkList">
          {(diagnostics?.checks ?? []).map((check) => <CheckRow check={check} key={check.id} />)}
        </div>
      </section>
    </div>
  );
}

function RulesPage({ config, processes, allProcesses, query, setQuery, refreshProcesses, updateRule, addRule, addRules, removeRule }: { config: AppConfig; processes: RunningProcess[]; allProcesses: RunningProcess[]; query: string; setQuery: (value: string) => void; refreshProcesses: () => Promise<void>; updateRule: (id: string, patch: Partial<ProcessRule>) => void; addRule: (name?: string) => void; addRules: (names: string[]) => void; removeRule: (id: string) => void }) {
  const appGroups = useMemo(() => groupProcessesByApp(allProcesses), [allProcesses]);
  const processTree = useMemo(() => groupProcessesForTree(processes), [processes]);
  const [expandedApps, setExpandedApps] = useState<Record<string, boolean>>({});
  return (
    <div className="pageGrid twoColumns">
      <section className="panel mainPanel">
        <div className="panelHead"><div><h2>{"\u8fdb\u7a0b\u5206\u6d41\u89c4\u5219"}</h2><p>{"\u6309 exe \u6587\u4ef6\u540d\u5339\u914d；同一 exe 的不同 PID 会共用同一条规则"}</p></div><button className="compact" onClick={() => addRule()}><Plus size={16} />{"\u89c4\u5219"}</button></div>
        <div className="ruleList">
          {config.rules.map((rule) => (
            <article className={rule.enabled ? "rule activeRule" : "rule"} key={rule.id}>
              <label className="switch"><input type="checkbox" checked={rule.enabled} onChange={(event) => updateRule(rule.id, { enabled: event.target.checked })} /><span /></label>
              <input value={rule.processName} onChange={(event) => updateRule(rule.id, { processName: event.target.value })} />
              <Select value={rule.strategy} onChange={(value) => updateRule(rule.id, { strategy: value as RuleStrategy })}><option value="proxy">{"\u8d70\u4ee3\u7406"}</option><option value="direct">{"\u76f4\u8fde"}</option><option value="block">{"\u963b\u65ad"}</option></Select>
              <Select value={rule.proxyId} onChange={(value) => updateRule(rule.id, { proxyId: value })} disabled={rule.strategy !== "proxy"}>{config.proxies.map((proxy) => <option key={proxy.id} value={proxy.id}>{proxy.name}</option>)}</Select>
              <input className="notes" value={rule.notes} placeholder={"\u5907\u6ce8"} onChange={(event) => updateRule(rule.id, { notes: event.target.value })} />
              <button className="icon danger" title={"\u5220\u9664\u89c4\u5219"} onClick={() => removeRule(rule.id)}><Trash2 size={16} /></button>
            </article>
          ))}
        </div>
      </section>
      <section className="panel sidePanel">
        <div className="panelHead"><div><h2>{"\u8fd0\u884c\u8fdb\u7a0b"}</h2><p>{"\u70b9\u51fb\u8fdb\u7a0b\u6dfb\u52a0\u89c4\u5219"}</p></div><button className="icon" onClick={refreshProcesses}><RefreshCw size={17} /></button></div>
        <div className="search"><Search size={17} /><input placeholder={"\u641c\u7d22\u8fdb\u7a0b\u6216 PID"} value={query} onChange={(event) => setQuery(event.target.value)} /></div>
        <ProcessTree groups={processTree} rules={config.rules} expanded={expandedApps} setExpanded={setExpandedApps} addRule={addRule} addRules={addRules} />
        <div className="processGrid compactGrid legacyProcessGrid">
          {processes.map((process) => {
            const exists = config.rules.some((rule) => rule.processName.toLowerCase() === process.name.toLowerCase());
            return <button key={`${process.name}-${process.path || process.pid}`} className={exists ? "alreadyAdded" : ""} onClick={() => addRule(process.name)}><Cpu size={16} /><span>{process.name}</span><small>{exists ? "已添加规则；此 exe 名会覆盖所有路径" : `${process.session || "1 个进程"} · ${process.memory}`}</small></button>;
          })}
        </div>
        <div className="groupBlock">
          <h3>{"\u5e94\u7528\u7ec4\u89c4\u5219"}</h3>
          <p>{"\u540c\u4e00\u76ee\u5f55\u4e0b\u7684\u591a\u4e2a exe \u53ef\u4e00\u952e\u52a0\u5165\u89c4\u5219"}</p>
          <div className="appGroups">
            {appGroups.map((group) => (
              <button key={group.key} onClick={() => addRules(group.names)}>
                <strong>{group.label}</strong>
                <small>{group.names.join(", ")}</small>
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function ProcessTree({ groups, rules, expanded, setExpanded, addRule, addRules }: { groups: ProcessTreeGroup[]; rules: ProcessRule[]; expanded: Record<string, boolean>; setExpanded: React.Dispatch<React.SetStateAction<Record<string, boolean>>>; addRule: (name?: string) => void; addRules: (names: string[]) => void }) {
  const existing = useMemo(() => new Set(rules.map((rule) => rule.processName.toLowerCase())), [rules]);
  return (
    <div className="processTree">
      {groups.map((group) => {
        const open = expanded[group.key] ?? true;
        const groupNames = Array.from(new Set(group.items.map((item) => item.name)));
        return (
          <div className="processApp" key={group.key}>
            <div className="processAppHead">
              <button className="treeToggle" onClick={() => setExpanded((current) => ({ ...current, [group.key]: !open }))} title={open ? "收起" : "展开"}>
                {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>
              <Cpu size={16} />
              <div className="processAppTitle">
                <strong>{group.label} <span>({group.totalCount})</span></strong>
                <small>{group.path || "系统进程"}</small>
              </div>
              <button className="miniAction" onClick={() => addRules(groupNames)}>整组</button>
            </div>
            {open && <div className="processChildren">
              {group.items.map((process) => {
                const exists = existing.has(process.name.toLowerCase());
                return (
                  <button key={`${process.name}-${process.path || process.pid}`} className={exists ? "processChild alreadyAdded" : "processChild"} onClick={() => addRule(process.name)}>
                    <Cpu size={14} />
                    <span>{process.name}</span>
                    <small>{exists ? "已添加规则；此 exe 名会覆盖所有路径" : `${process.session || "1 个进程"} · ${process.memory}`}</small>
                  </button>
                );
              })}
            </div>}
          </div>
        );
      })}
      {!groups.length && <div className="emptyTree">没有找到匹配的运行进程</div>}
    </div>
  );
}

function ProxiesPage({ config, selectedProxy, setSelectedProxy, selectedProxyProfile, updateProxy, addProxy, removeProxy }: { config: AppConfig; selectedProxy: string; setSelectedProxy: (id: string) => void; selectedProxyProfile?: ProxyProfile; updateProxy: (id: string, patch: Partial<ProxyProfile>) => void; addProxy: () => void; removeProxy: (id: string) => void }) {
  return (
    <div className="pageGrid twoColumns">
      <section className="panel sidePanel">
        <div className="panelHead"><div><h2>{"\u4ee3\u7406\u8282\u70b9"}</h2><p>{"\u9009\u62e9\u5de6\u4fa7\u8282\u70b9\u540e\u7f16\u8f91"}</p></div><button className="icon" onClick={addProxy}><Plus size={17} /></button></div>
        <div className="proxyList">{config.proxies.map((proxy) => <button key={proxy.id} className={selectedProxy === proxy.id ? "selected" : ""} onClick={() => setSelectedProxy(proxy.id)}><span>{proxy.name}</span><small>{proxy.type} · {proxy.host}:{proxy.port}</small></button>)}</div>
      </section>
      <section className="panel mainPanel">
        <div className="panelHead"><div><h2>{"\u8282\u70b9\u8be6\u60c5"}</h2><p>{"HTTP\u3001HTTPS\u3001SOCKS5 \u5747\u53ef\u914d\u7f6e"}</p></div></div>
        {selectedProxyProfile && <div className="formGrid proxyForm">
          <label>{"\u540d\u79f0"}<input value={selectedProxyProfile.name} onChange={(event) => updateProxy(selectedProxyProfile.id, { name: event.target.value })} /></label>
          <label>{"\u7c7b\u578b"}<Select value={selectedProxyProfile.type} onChange={(value) => updateProxy(selectedProxyProfile.id, { type: value as ProxyType })}><option>SOCKS5</option><option>HTTP</option><option>HTTPS</option></Select></label>
          <label>{"\u4e3b\u673a"}<input value={selectedProxyProfile.host} onChange={(event) => updateProxy(selectedProxyProfile.id, { host: event.target.value })} /></label>
          <label>{"\u7aef\u53e3"}<input type="number" value={selectedProxyProfile.port} onChange={(event) => updateProxy(selectedProxyProfile.id, { port: Number(event.target.value) })} /></label>
          <label>{"\u7528\u6237\u540d"}<input value={selectedProxyProfile.username} onChange={(event) => updateProxy(selectedProxyProfile.id, { username: event.target.value })} /></label>
          <label>{"\u5bc6\u7801"}<input type="password" value={selectedProxyProfile.password} onChange={(event) => updateProxy(selectedProxyProfile.id, { password: event.target.value })} /></label>
          <div className="inlineOption"><label className="switch"><input type="checkbox" checked={selectedProxyProfile.enabled} onChange={(event) => updateProxy(selectedProxyProfile.id, { enabled: event.target.checked })} /><span /></label>{"\u542f\u7528\u8be5\u4ee3\u7406"}</div>
          <button className="dangerLine" onClick={() => removeProxy(selectedProxyProfile.id)}><Trash2 size={16} />{"\u5220\u9664\u8282\u70b9"}</button>
        </div>}
      </section>
    </div>
  );
}

function MonitorPage({ traffic, core, refreshTraffic }: { traffic: TrafficSnapshot; core: CoreStatus; refreshTraffic: () => Promise<void> }) {
  const proxied = traffic.processes.filter((item) => item.proxied);
  const direct = traffic.processes.filter((item) => !item.proxied);
  const totals = trafficTotals(traffic);
  return (
    <div className="pageGrid monitorGrid">
      <section className="panel wide">
        <div className="panelHead"><div><h2>{"\u8fdb\u7a0b\u4ee3\u7406\u4e0e\u6d41\u91cf"}</h2><p>{core.running ? "\u6bcf 1.5 \u79d2\u81ea\u52a8\u5237\u65b0" : "\u542f\u52a8\u771f\u5b9e\u5206\u6d41\u540e\u663e\u793a\u6570\u636e"}</p></div><button className="compact" onClick={refreshTraffic}><RefreshCw size={16} />{"\u5237\u65b0"}</button></div>
        <div className="trafficCards">
          <Metric label={"\u603b\u4e0b\u884c / \u4e0a\u884c"} value={<FlowPair down={formatBytes(totals.total.download)} up={formatBytes(totals.total.upload)} />} />
          <Metric label={"\u4ee3\u7406\u4e0b\u884c / \u4e0a\u884c"} value={<FlowPair down={formatBytes(totals.proxied.download)} up={formatBytes(totals.proxied.upload)} />} />
          <Metric label={"\u76f4\u8fde\u4e0b\u884c / \u4e0a\u884c"} value={<FlowPair down={formatBytes(totals.direct.download)} up={formatBytes(totals.direct.upload)} />} />
          <Metric label={"\u5b9e\u65f6\u603b\u901f\u7387"} value={<FlowPair down={`${formatBytes(traffic.totalDownloadRate ?? 0)}/s`} up={`${formatBytes(traffic.totalUploadRate ?? 0)}/s`} />} />
        </div>
        <div className="trafficSections">
          <TrafficSection title={"\u5df2\u4f7f\u7528\u4ee3\u7406\u7684\u8fdb\u7a0b"} rows={proxied} empty={core.running ? "\u6682\u65e0\u8d70\u4ee3\u7406\u7684\u8fde\u63a5" : "\u771f\u5b9e\u5206\u6d41\u672a\u542f\u52a8"} />
          <TrafficSection title={"\u76f4\u8fde / \u672a\u4f7f\u7528\u4ee3\u7406\u7684\u8fdb\u7a0b"} rows={direct} empty={core.running ? "\u6682\u65e0\u76f4\u8fde\u8fde\u63a5" : "\u771f\u5b9e\u5206\u6d41\u672a\u542f\u52a8"} />
        </div>
      </section>
    </div>
  );
}

function TrafficSection({ title, rows, empty }: { title: string; rows: TrafficProcess[]; empty: string }) {
  return (
    <div className="trafficSection">
      <h3>{title}</h3>
      <div className="trafficTable">
        <div className="tableHead"><span>{"\u8fdb\u7a0b"}</span><span>{"\u5f53\u524d\u4ee3\u7406"}</span><span>{"\u901f\u7387"}</span><span>{"\u7d2f\u8ba1\u6d41\u91cf"}</span><span>{"\u8fde\u63a5"}</span></div>
        {rows.map((item) => <div className="trafficRow" key={item.processName}><strong>{item.processName}</strong><span>{item.proxy}</span><span><FlowValue dir="down" value={`${formatBytes(item.downloadRate ?? 0)}/s`} /><FlowValue dir="up" value={`${formatBytes(item.uploadRate ?? 0)}/s`} /></span><span><FlowValue dir="down" value={formatBytes(item.download)} /><FlowValue dir="up" value={formatBytes(item.upload)} /></span><span>{item.connections}</span></div>)}
        {!rows.length && <div className="emptyState">{empty}</div>}
      </div>
    </div>
  );
}

function SettingsPage({ config, setConfig, diagnostics, runDiagnostics }: { config: AppConfig; setConfig: React.Dispatch<React.SetStateAction<AppConfig>>; diagnostics: EngineDiagnostics | null; runDiagnostics: () => Promise<void> }) {
  return (
    <div className="pageGrid twoColumns">
      <section className="panel">
        <div className="panelHead"><div><h2>{"\u5185\u7f6e TUN \u8bbe\u7f6e"}</h2><p>{"\u53ea\u663e\u793a\u5f53\u524d\u7248\u672c\u771f\u6b63\u652f\u6301\u7684\u80fd\u529b"}</p></div></div>
        <div className="settingsList">
          <div className="readonlySetting"><span>{"\u63a5\u7ba1\u6a21\u5f0f"}</span><strong>{C.tun}</strong></div>
          <label>{"DNS \u7b56\u7565"}<Select value={config.dnsMode} onChange={(value) => setConfig({ ...config, dnsMode: value as AppConfig["dnsMode"] })}><option value="system">{"\u7cfb\u7edf DNS"}</option><option value="proxy">{"\u968f\u4ee3\u7406\u8f6c\u53d1"}</option><option value="secure">{"\u5b89\u5168 DNS"}</option></Select></label>
          <Toggle label={"\u4ee3\u7406\u5931\u6548\u65f6\u963b\u65ad\u6d41\u91cf"} checked={config.killSwitch} onChange={(killSwitch) => setConfig({ ...config, killSwitch })} />
          <Toggle label={"\u5f00\u673a\u81ea\u52a8\u542f\u52a8"} checked={config.startWithWindows} onChange={(startWithWindows) => setConfig({ ...config, startWithWindows })} />
          <Toggle label={"\u5173\u95ed\u65f6\u6700\u5c0f\u5316\u5230\u6258\u76d8"} checked={config.minimizeToTray} onChange={(minimizeToTray) => setConfig({ ...config, minimizeToTray })} />
        </div>
      </section>
      <section className="panel diagnostics">
        <div className="panelHead"><div><h2>{"\u63a5\u7ba1\u8bca\u65ad"}</h2><p>{"\u53ea\u68c0\u67e5\u5f53\u524d\u5b9e\u9645\u4f7f\u7528\u7684\u7ec4\u4ef6"}</p></div><button className="compact" onClick={runDiagnostics}><Shield size={16} />{"\u8bca\u65ad"}</button></div>
        <div className="checkList">
          {(diagnostics?.checks ?? []).map((check) => <CheckRow check={check} key={check.id} />)}
          {!diagnostics && <div className="check"><CircleDashed size={18} /><div><strong>{"\u7b49\u5f85\u8bca\u65ad"}</strong><span>{"\u70b9\u51fb\u8bca\u65ad\u540e\u663e\u793a\u7ed3\u679c"}</span></div></div>}
        </div>
      </section>
    </div>
  );
}

function CheckRow({ check }: { check: EngineCheck }) {
  return <div className={check.ok ? "check ok" : "check warn"}>{check.ok ? <CircleCheck size={18} /> : <AlertTriangle size={18} />}<div><strong>{check.label}</strong><span>{check.detail}</span></div></div>;
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="metric"><span>{label}</span><strong>{value}</strong></div>;
}

function FlowPair({ down, up }: { down: string; up: string }) {
  return <span className="metricFlow"><FlowValue dir="down" value={down} /><FlowValue dir="up" value={up} /></span>;
}

function FlowValue({ dir, value }: { dir: "up" | "down"; value: string }) {
  return <span className={`flowValue ${dir}`}><span className="flowIcon" aria-hidden="true" /><span>{value}</span></span>;
}

function normalizeConfig(config: AppConfig): AppConfig {
  return { ...config, engineMode: "tun" };
}

type MergedProcess = RunningProcess & { count?: number; pids?: number[] };
type ProcessTreeGroup = { key: string; label: string; path: string; totalCount: number; items: MergedProcess[] };

function mergeProcessesByExe(processes: RunningProcess[]) {
  const groups = new Map<string, RunningProcess & { count: number; pids: number[] }>();
  for (const process of processes) {
    const key = process.path ? `${process.name.toLowerCase()}|${process.path.toLowerCase()}` : process.name.toLowerCase();
    const current = groups.get(key);
    if (!current) {
      groups.set(key, { ...process, count: 1, pids: [process.pid] });
      continue;
    }
    current.count += 1;
    current.pids.push(process.pid);
    if (!current.path && process.path) current.path = process.path;
  }
  return Array.from(groups.values())
    .map((item) => ({
      ...item,
      session: `${item.count} 个进程`,
      memory: `${item.path ? item.path : `PID ${item.pids.slice(0, 3).join(", ")}${item.pids.length > 3 ? "..." : ""}`}`
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function groupProcessesForTree(processes: RunningProcess[]): ProcessTreeGroup[] {
  const groups = new Map<string, ProcessTreeGroup>();
  for (const process of processes as MergedProcess[]) {
    const folder = process.path ? process.path.split(/[\\/]/).slice(0, -1).join("\\") : "";
    const baseName = process.name.replace(/\.exe$/i, "");
    const key = folder ? folder.toLowerCase() : `system|${baseName.toLowerCase()}`;
    const label = folder ? appLabelFromProcesses(folder, [process]) : readableProcessName(baseName);
    const count = process.count ?? process.pids?.length ?? 1;
    const current = groups.get(key);
    if (!current) {
      groups.set(key, { key, label, path: folder, totalCount: count, items: [process] });
      continue;
    }
    current.totalCount += count;
    current.items.push(process);
  }
  return Array.from(groups.values())
    .map((group) => {
      const items = group.items.sort((a, b) => a.name.localeCompare(b.name));
      return { ...group, label: appLabelFromProcesses(group.path, items), items };
    })
    .sort((a, b) => a.label.localeCompare(b.label));
}

function groupProcessesByApp(processes: RunningProcess[]) {
  const groups = new Map<string, { key: string; label: string; names: string[] }>();
  for (const process of processes) {
    if (!process.path) continue;
    const folder = process.path.split(/[\\/]/).slice(0, -1).join("\\");
    if (!folder) continue;
    const names = groups.get(folder)?.names ?? [];
    if (!names.includes(process.name)) names.push(process.name);
    groups.set(folder, { key: folder, label: appLabelFromNames(folder, names), names });
  }
  return Array.from(groups.values())
    .filter((group) => group.names.length > 1)
    .map((group) => ({ ...group, label: appLabelFromNames(group.key, group.names) }))
    .sort((a, b) => b.names.length - a.names.length)
    .slice(0, 8);
}

function appLabelFromProcesses(folder: string, processes: MergedProcess[]) {
  return appLabelFromNames(folder, processes.map((process) => process.name));
}

function appLabelFromNames(folder: string, names: string[]) {
  const folderName = folder.split(/[\\/]/).filter(Boolean).pop() || "";
  const pathName = bestFolderLabel(folder);
  const meaningful = names
    .map((name) => name.replace(/\.exe$/i, ""))
    .filter((name) => name && !isHelperProcessName(name) && !isGenericFolderName(name))
    .sort((a, b) => scoreAppName(a, folderName) - scoreAppName(b, folderName));
  const fallbackName = names.map((name) => name.replace(/\.exe$/i, "")).find((name) => name && !isGenericFolderName(name));
  const picked = meaningful[0] || fallbackName || pathName || folderName;
  if (!isGenericFolderName(folderName) && scoreAppName(folderName, folderName) <= scoreAppName(picked, folderName) - 2) {
    return readableProcessName(folderName);
  }
  if (isGenericFolderName(picked) && pathName) return readableProcessName(pathName);
  return readableProcessName(picked);
}

function bestFolderLabel(folder: string) {
  const parts = folder.split(/[\\/]/).filter(Boolean).reverse();
  return parts.find((part) => !isGenericFolderName(part)) || "";
}

function isGenericFolderName(name: string) {
  return /^(app|apps|application|applications|bin|current|program|programs|resources|release|win-unpacked|x64|x86)$/i.test(name) || isVersionFolderName(name);
}

function isVersionFolderName(name: string) {
  return /^v?\d+(?:[._-]\d+){1,5}(?:[-_][a-z0-9]+)?(?:\(\d+\))?$/i.test(name);
}

function isHelperProcessName(name: string) {
  return /(^|[-_\s])(helper|renderer|utility|crashpad|updater|update|service|broker|sandbox|gpu|node|repl|cli|host)([-_\s]|$)/i.test(name);
}

function scoreAppName(name: string, folderName: string) {
  let score = 0;
  if (isGenericFolderName(name)) score += 20;
  if (isHelperProcessName(name)) score += 10;
  if (folderName && name.localeCompare(folderName, undefined, { sensitivity: "accent" }) === 0) score -= 3;
  score += Math.min(name.length / 12, 4);
  return score;
}

function readableProcessName(name: string) {
  return name
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function trafficTotals(traffic: TrafficSnapshot) {
  const totals = {
    total: { download: 0, upload: 0 },
    proxied: { download: 0, upload: 0 },
    direct: { download: 0, upload: 0 }
  };
  for (const item of traffic.processes) {
    totals.total.download += item.download;
    totals.total.upload += item.upload;
    const bucket = item.proxied ? totals.proxied : totals.direct;
    bucket.download += item.download;
    bucket.upload += item.upload;
  }
  return totals;
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  return `${value >= 10 || index === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[index]}`;
}

function Stat({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: React.ReactNode; sub: string }) {
  return <section className="stat"><div>{icon}</div><strong>{value}</strong><span>{label}</span><small>{sub}</small></section>;
}

function Select({ children, value, onChange, disabled = false }: { children: React.ReactNode; value: string; onChange: (value: string) => void; disabled?: boolean }) {
  return <div className="selectWrap"><select disabled={disabled} value={value} onChange={(event) => onChange(event.target.value)}>{children}</select><ChevronDown size={15} /></div>;
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <div className="toggleRow"><span>{label}</span><label className="switch"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /><span /></label></div>;
}

createRoot(document.getElementById("root")!).render(<App />);
