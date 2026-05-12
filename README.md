# ProcessProxy Desk

ProcessProxy Desk 是一款面向 Windows 的进程级代理分流桌面应用。它可以让不同应用进程使用不同的 HTTP / HTTPS / SOCKS5 代理，并提供清晰的图形界面来管理进程规则、代理节点、真实分流状态和流量监控。

当前版本使用内置 Mihomo TUN 核心实现真实按进程分流，适合需要让浏览器、聊天工具、开发工具、游戏平台等不同软件走不同代理策略的 Windows 用户。

## 下载与安装

请在 GitHub Releases 下载最新安装包：

```text
ProcessProxy Desk Setup 0.1.0.exe
```

安装包支持安装向导和自定义安装路径。普通用户不需要提前安装 Node.js、Electron 或 Mihomo。

安装和启动真实 TUN 分流时，Windows 可能会弹出管理员权限确认，这是因为 TUN 分流需要创建虚拟网络接口并写入必要路由。

## 适用场景

- 让浏览器走一个代理，聊天软件走另一个代理。
- 让某些开发工具走代理，其他软件保持直连。
- 按 exe 进程名快速添加分流规则。
- 查看当前哪些进程正在走代理，哪些进程仍然直连。
- 观察每个进程的实时上下行速率和累计流量。

## 主要功能

- 进程规则：按 exe 文件名配置“走代理 / 直连 / 阻断”策略。
- 代理节点：支持 HTTP、HTTPS、SOCKS5。
- 真实分流：通过内置 Mihomo TUN 模式接管网络。
- 运行进程：按应用组展开显示，并合并同一路径下同名 exe 的多个 PID。
- 防重复规则：重复添加同一 exe 时会提示或阻止。
- 流量监控：区分“已使用代理的进程”和“直连 / 未使用代理的进程”。
- 统计信息：显示实时上下行速率、累计流量、连接数和当前代理链路。
- 诊断工具：检查管理员权限、内置核心、代理节点和规则有效性。
- Windows 安装包：支持选择安装路径、桌面快捷方式和开始菜单快捷方式。

## 快速使用

1. 下载并安装 `ProcessProxy Desk Setup 0.1.0.exe`。
2. 启动 ProcessProxy Desk。
3. 打开“代理节点”，添加可用的 HTTP / HTTPS / SOCKS5 代理。
4. 打开“进程规则”，从运行进程中选择应用，或手动输入 exe 文件名。
5. 点击“保存并应用”。
6. 点击“启动真实分流”。
7. 打开“流量监控”查看代理进程、直连进程和实时流量。

## 系统要求

- Windows 10 / Windows 11 x64
- 管理员权限，用于启动 TUN 分流
- 可用的 HTTP / HTTPS / SOCKS5 代理节点

## 当前限制

- 当前规则按 exe 文件名匹配，不按完整路径匹配。
- 同名 exe 即使来自不同目录，也会命中同一条 `PROCESS-NAME` 规则。
- 流量监控数据来自 Mihomo 本地控制接口，与 Windows 任务管理器统计口径不同。
- 当前版本没有内置自动更新功能。

## 关于 Mihomo

ProcessProxy Desk 使用 Mihomo 作为第三方网络核心。Mihomo 不属于本项目原创代码，本项目通过可视化界面生成配置、启动核心并读取本地控制接口数据。

本仓库采用“提交 Mihomo 二进制”的方式，默认包含：

```text
vendor/mihomo/mihomo-windows-amd64-v1.exe
```

当前内置版本：

```text
Mihomo Meta v1.19.24 windows amd64
```

发布或分发安装包时，请同时遵守 Mihomo 上游许可证要求。详见 [Mihomo 核心说明](docs/MIHOMO.md) 和 [第三方声明](THIRD_PARTY_NOTICES.md)。

## 文档

- [安装说明](docs/INSTALL.md)
- [使用指南](docs/USAGE.md)
- [常见问题](docs/FAQ.md)
- [v0.1.0 发布说明](docs/RELEASE_NOTES_v0.1.0.md)
- [Mihomo 核心说明](docs/MIHOMO.md)
- [第三方声明](THIRD_PARTY_NOTICES.md)
- [安全说明](SECURITY.md)
- [更新日志](CHANGELOG.md)

## 开发者

本项目使用 Electron、React、TypeScript、Vite 和 electron-builder。

```powershell
npm install
npm run dev
```

构建 Windows 安装包：

```powershell
npm run build
```

更多开发和发布说明：

- [开发说明](docs/DEVELOPMENT.md)
- [发布到 GitHub](docs/PUBLISHING.md)
- [贡献指南](CONTRIBUTING.md)

## 免责声明

本项目仅用于合法网络访问、开发调试和个人网络环境管理。请遵守所在地法律法规、公司网络政策和代理服务条款。使用者需要自行承担因网络配置、代理服务、系统权限或第三方核心导致的风险。

## 许可证

ProcessProxy Desk 源代码使用 MIT License。详见 [LICENSE](LICENSE)。

随包包含的 Mihomo 受其上游许可证约束，不受本项目 MIT License 覆盖。
