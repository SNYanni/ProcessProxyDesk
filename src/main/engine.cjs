const { execFile, spawn } = require("node:child_process");
const { existsSync, mkdirSync, writeFileSync } = require("node:fs");
const { join } = require("node:path");

let coreProcess = null;
let coreStartedAt = null;

function run(command, args) {
  return new Promise((resolve) => {
    execFile(command, args, { windowsHide: true }, (error, stdout, stderr) => {
      resolve({
        ok: !error,
        stdout: stdout || "",
        stderr: stderr || "",
        message: error ? error.message : ""
      });
    });
  });
}

function compileRules(config) {
  const proxies = new Map(config.proxies.map((proxy) => [proxy.id, proxy]));

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    engine: {
      enabled: config.engineEnabled,
      mode: "tun",
      dnsMode: config.dnsMode,
      killSwitch: config.killSwitch
    },
    rules: config.rules
      .filter((rule) => rule.enabled)
      .map((rule) => {
        const proxy = proxies.get(rule.proxyId);
        return {
          id: rule.id,
          processName: rule.processName.trim().toLowerCase(),
          action: rule.strategy,
          proxy: rule.strategy === "proxy" && proxy
            ? {
                id: proxy.id,
                name: proxy.name,
                type: proxy.type,
                host: proxy.host,
                port: proxy.port,
                username: proxy.username || undefined
              }
            : undefined,
          notes: rule.notes
        };
      })
  };
}

function yamlScalar(value) {
  if (value === undefined || value === null || value === "") return "\"\"";
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(String(value));
}

function proxyType(proxy) {
  return proxy.type === "SOCKS5" ? "socks5" : "http";
}

function writeCoreConfig(config, userDataPath) {
  const engineDir = join(userDataPath, "engine");
  mkdirSync(engineDir, { recursive: true });
  const configPath = join(engineDir, "mihomo-config.yaml");
  const enabledProxies = config.proxies.filter((proxy) => proxy.enabled);
  const lines = [
    "mixed-port: 7897",
    "allow-lan: false",
    "mode: rule",
    "log-level: info",
    "ipv6: false",
    "external-controller: 127.0.0.1:9097",
    "find-process-mode: strict",
    "",
    "tun:",
    "  enable: true",
    "  stack: gvisor",
    "  auto-route: true",
    "  auto-detect-interface: true",
    "  strict-route: true",
    "",
    "dns:",
    "  enable: true",
    "  listen: 127.0.0.1:1053",
    "  enhanced-mode: fake-ip",
    "  fake-ip-range: 198.18.0.1/16",
    "  nameserver:",
    "    - 223.5.5.5",
    "    - 119.29.29.29",
    "",
    "proxies:"
  ];

  if (enabledProxies.length === 0) {
    lines.push("  []");
  } else {
    for (const proxy of enabledProxies) {
      lines.push(`  - name: ${yamlScalar(proxy.name)}`);
      lines.push(`    type: ${proxyType(proxy)}`);
      lines.push(`    server: ${yamlScalar(proxy.host)}`);
      lines.push(`    port: ${proxy.port}`);
      if (proxy.type === "HTTPS") lines.push("    tls: true");
      if (proxy.username) lines.push(`    username: ${yamlScalar(proxy.username)}`);
      if (proxy.password) lines.push(`    password: ${yamlScalar(proxy.password)}`);
      lines.push("    udp: true");
    }
  }

  lines.push("");
  lines.push("proxy-groups:");
  lines.push("  - name: \"ProcessProxy-Auto\"");
  lines.push("    type: select");
  lines.push("    proxies:");
  lines.push("      - DIRECT");
  for (const proxy of enabledProxies) lines.push(`      - ${yamlScalar(proxy.name)}`);
  lines.push("");
  lines.push("rules:");

  for (const rule of config.rules.filter((item) => item.enabled)) {
    const proxy = config.proxies.find((item) => item.id === rule.proxyId);
    const action = rule.strategy === "block" ? "REJECT" : rule.strategy === "direct" ? "DIRECT" : proxy?.name ?? "ProcessProxy-Auto";
    lines.push(`  - PROCESS-NAME,${rule.processName.trim()},${action}`);
  }
  lines.push("  - MATCH,DIRECT");

  writeFileSync(configPath, `${lines.join("\n")}\n`, "utf8");
  return configPath;
}

function validateConfig(config) {
  const issues = [];
  const proxies = new Map(config.proxies.map((proxy) => [proxy.id, proxy]));

  for (const proxy of config.proxies) {
    if (!proxy.host.trim()) issues.push(`代理“${proxy.name}”缺少主机地址`);
    if (!Number.isInteger(proxy.port) || proxy.port <= 0 || proxy.port > 65535) issues.push(`代理“${proxy.name}”端口无效`);
  }

  for (const rule of config.rules.filter((item) => item.enabled)) {
    const name = rule.processName.trim();
    const proxy = proxies.get(rule.proxyId);
    if (!/^[\w .-]+\.exe$/i.test(name)) issues.push(`规则“${name}”不像有效的 exe 进程名`);
    if (rule.strategy === "proxy" && !proxy) issues.push(`规则“${name}”没有绑定可用代理`);
    if (rule.strategy === "proxy" && proxy?.enabled === false) issues.push(`规则“${name}”绑定的代理已停用`);
  }

  return issues;
}

async function isElevated() {
  const result = await run("powershell.exe", [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-Command",
    "(New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)"
  ]);
  return result.stdout.trim().toLowerCase() === "true";
}

async function diagnose(config, corePath) {
  const elevated = await isElevated();
  const validationIssues = validateConfig(config);
  const coreInstalled = corePath ? existsSync(corePath) : true;

  return {
    elevated,
    coreInstalled,
    validationIssues,
    checks: [
      {
        id: "admin",
        label: "管理员权限",
        ok: elevated,
        detail: elevated ? "当前具备启动 TUN 分流所需权限" : "请以管理员身份运行，Windows TUN 路由需要提升权限"
      },
      {
        id: "core",
        label: "内置 Mihomo 内核",
        ok: coreInstalled,
        detail: coreInstalled ? "已包含可用的内置代理内核" : "未找到内置代理内核文件"
      },
      {
        id: "rules",
        label: "规则有效性",
        ok: validationIssues.length === 0,
        detail: validationIssues.length ? validationIssues.join("；") : "进程规则和代理节点配置有效"
      }
    ]
  };
}

async function applyEngine(config, userDataPath, corePath) {
  const compiled = compileRules(config);
  const diagnostics = await diagnose(config, corePath);
  const engineDir = join(userDataPath, "engine");
  mkdirSync(engineDir, { recursive: true });
  const rulesPath = join(engineDir, "compiled-rules.json");
  writeFileSync(rulesPath, JSON.stringify(compiled, null, 2), "utf8");
  const coreConfigPath = writeCoreConfig(config, userDataPath);

  return {
    ok: diagnostics.validationIssues.length === 0 && diagnostics.coreInstalled,
    rulesPath,
    coreConfigPath,
    diagnostics,
    message: diagnostics.validationIssues.length === 0
      ? "规则已生成，可用于内置 TUN 分流。"
      : "规则已生成，但仍有配置项需要修正。"
  };
}

function coreStatus() {
  const running = Boolean(coreProcess && !coreProcess.killed && coreProcess.exitCode === null);
  return {
    running,
    pid: running ? coreProcess.pid : null,
    startedAt: running ? coreStartedAt : null
  };
}

async function startCore(config, userDataPath, corePath) {
  const diagnostics = await diagnose(config, corePath);
  if (!diagnostics.elevated) {
    return {
      ok: false,
      ...coreStatus(),
      diagnostics,
      message: "真实 TUN 分流需要管理员权限。请以管理员身份重新启动 ProcessProxy Desk。"
    };
  }
  if (!diagnostics.coreInstalled) {
    return {
      ok: false,
      ...coreStatus(),
      diagnostics,
      message: "未找到内置 Mihomo 内核，无法启动真实分流。"
    };
  }
  if (diagnostics.validationIssues.length) {
    return {
      ok: false,
      ...coreStatus(),
      diagnostics,
      message: diagnostics.validationIssues.join("；")
    };
  }

  const applied = await applyEngine(config, userDataPath, corePath);
  if (coreStatus().running) {
    stopCore();
  }

  const engineDir = join(userDataPath, "engine");
  coreProcess = spawn(corePath, ["-d", engineDir, "-f", applied.coreConfigPath], {
    cwd: engineDir,
    windowsHide: true,
    stdio: "ignore"
  });
  coreStartedAt = new Date().toISOString();
  coreProcess.once("exit", () => {
    coreProcess = null;
    coreStartedAt = null;
  });

  return {
    ok: true,
    ...coreStatus(),
    rulesPath: applied.rulesPath,
    coreConfigPath: applied.coreConfigPath,
    diagnostics: applied.diagnostics,
    message: "真实分流内核已启动。现在会按进程规则通过 TUN 模式接管网络。"
  };
}

function stopCore() {
  if (coreProcess && coreProcess.exitCode === null) {
    coreProcess.kill();
  }
  coreProcess = null;
  coreStartedAt = null;
  return {
    ok: true,
    ...coreStatus(),
    message: "真实分流内核已停止。"
  };
}

module.exports = {
  applyEngine,
  compileRules,
  coreStatus,
  diagnose,
  startCore,
  stopCore,
  validateConfig,
  writeCoreConfig
};
