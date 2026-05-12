# ProcessProxy Desk

ProcessProxy Desk 是一个面向 Windows 的桌面工具，用来为不同应用进程配置不同的网络代理。它提供可视化界面、进程规则管理、代理节点配置、TUN 分流启动、流量监控和诊断能力。

> 当前版本聚焦 Windows x64，并使用内置 Mihomo TUN 模式实现真实按进程分流。

## 功能特性

- 按进程名配置分流规则，例如让 `chrome.exe`、`wechat.exe`、`slack.exe` 使用不同代理。
- 支持 HTTP、HTTPS、SOCKS5 代理节点。
- 内置 Mihomo Windows x64 核心，通过 TUN 模式接管网络。
- 运行进程列表支持按应用组展开，并合并同一路径下的同名 exe 多 PID。
- 重复添加进程规则时会提示或阻止，避免规则混乱。
- 流量监控区分“已使用代理的进程”和“直连 / 未使用代理的进程”。
- 显示实时上下行速率、累计上下行流量、连接数量和当前代理链路。
- 诊断管理员权限、内置核心、代理节点和规则有效性。
- Windows 安装包支持选择安装路径。

## 截图

可以在发布前把截图放到 `docs/images/`，然后在这里引用：

```md
![总览](docs/images/overview.png)
![进程规则](docs/images/rules.png)
![流量监控](docs/images/monitor.png)
```

## 系统要求

- Windows 10 / Windows 11 x64
- 管理员权限，用于启动 TUN 分流和写入必要路由
- 可用的 HTTP / HTTPS / SOCKS5 代理节点

安装包已经包含 Electron 运行时和 Mihomo 核心，不需要用户额外安装 Node.js。

## 快速开始

### 使用安装包

1. 从 Release 下载 `ProcessProxy Desk Setup 0.1.0.exe`。
2. 运行安装包，根据安装向导选择安装路径。
3. 启动 ProcessProxy Desk。
4. 在“代理节点”中配置可用代理。
5. 在“进程规则”中选择运行进程或手动添加 exe 名。
6. 点击“保存并应用”。
7. 点击“启动真实分流”。

### 本地开发运行

```powershell
npm install
npm run dev
```

### 构建 Windows 安装包

```powershell
npm run build
```

构建产物位于 `release/`：

- `release/ProcessProxy Desk Setup 0.1.0.exe`
- `release/win-unpacked/ProcessProxy Desk.exe`

## 文档

- [安装说明](docs/INSTALL.md)
- [使用指南](docs/USAGE.md)
- [开发说明](docs/DEVELOPMENT.md)
- [Mihomo 核心说明](docs/MIHOMO.md)
- [发布到 GitHub](docs/PUBLISHING.md)
- [v0.1.0 发布说明](docs/RELEASE_NOTES_v0.1.0.md)
- [常见问题](docs/FAQ.md)
- [安全说明](SECURITY.md)
- [贡献指南](CONTRIBUTING.md)
- [更新日志](CHANGELOG.md)

## 工作原理

ProcessProxy Desk 会根据界面中的进程规则生成 Mihomo 配置，然后启动内置 Mihomo 核心。当前版本使用 TUN 模式接管网络，并通过 Mihomo 的 `PROCESS-NAME` 规则按 exe 文件名匹配进程。

需要注意：当前规则粒度是 exe 文件名，不是完整路径。同一个 exe 文件名在不同目录下运行时，会命中同一条 `PROCESS-NAME` 规则。

## 关于 Mihomo

本项目使用 Mihomo 作为第三方网络核心。Mihomo 不属于本项目原创代码，本项目只是通过可视化界面生成配置、启动核心并读取本地控制接口数据。

本仓库采用“提交 Mihomo 二进制”的方式，默认包含：

```text
vendor/mihomo/mihomo-windows-amd64-v1.exe
```

当前内置版本：

```text
Mihomo Meta v1.19.24 windows amd64
```

发布或分发安装包时，请务必确认 Mihomo 二进制文件的来源、版本和许可证要求，并在 Release 说明中标注。详见 [Mihomo 核心说明](docs/MIHOMO.md) 和 [第三方声明](THIRD_PARTY_NOTICES.md)。

## 项目结构

```text
ProcessProxyDesk/
├─ src/
│  ├─ main/          # Electron 主进程、Mihomo 启停、配置生成、流量采集
│  ├─ preload/       # Electron preload IPC 桥接
│  └─ renderer/      # React UI
├─ vendor/mihomo/    # 内置 Mihomo Windows x64 核心
├─ docs/             # 项目文档
├─ release/          # 本地构建产物，不建议提交到 Git
└─ package.json
```

## 免责声明

本项目仅用于合法网络访问、开发调试和个人网络环境管理。请遵守所在地法律法规、公司网络政策和代理服务条款。使用者需要自行承担因网络配置、代理服务、系统权限或第三方核心导致的风险。

## 许可证

本项目使用 MIT License。详见 [LICENSE](LICENSE)。
