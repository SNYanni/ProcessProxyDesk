# ProcessProxy Desk 0.1.0

这是 ProcessProxy Desk 的首个公开版本，面向 Windows x64，用于通过可视化界面为不同应用进程配置不同网络代理。

## 下载

请下载并运行：

```text
ProcessProxy Desk Setup 0.1.0.exe
```

安装向导支持选择安装路径。

## 主要功能

- 支持 Windows x64。
- 支持 HTTP / HTTPS / SOCKS5 代理节点。
- 支持按 exe 进程名配置分流规则。
- 支持内置 Mihomo TUN 真实分流。
- 支持运行进程按应用组展开。
- 支持同一路径下同名 exe 多 PID 合并显示。
- 支持代理进程与直连进程分组显示。
- 支持实时上下行速率、累计流量、连接数和当前代理链路显示。
- 支持配置诊断、规则生成和一键保存并应用。

## 系统要求

- Windows 10 / Windows 11 x64。
- 启动真实 TUN 分流需要管理员权限。
- 需要自行准备可用的 HTTP / HTTPS / SOCKS5 代理节点。

安装包已经包含 Electron 运行时和 Mihomo 核心，不需要提前安装 Node.js。

## 第三方核心说明

本版本随包包含 Mihomo Windows x64 核心：

```text
Mihomo Meta v1.19.24 windows amd64
```

Mihomo 是第三方开源网络核心，不属于 ProcessProxy Desk 原创代码。ProcessProxy Desk 使用 Mihomo 实现 TUN 分流、规则路由和连接信息读取。

Mihomo 上游项目：

```text
https://github.com/MetaCubeX/mihomo
```

许可证请以 Mihomo 上游项目为准。当前上游 Go 包元数据标注 Mihomo v1.19.24 的许可证为 GPL-3.0。

## 已知限制

- 当前规则按 exe 文件名匹配，不按完整路径匹配。
- 同名 exe 即使来自不同目录，也会命中同一条 `PROCESS-NAME` 规则。
- 流量监控数据来自 Mihomo 本地控制接口，与 Windows 任务管理器统计口径不同。
- 当前没有内置自动更新功能。

## 安全和合规提醒

本工具仅用于合法网络访问、开发调试和个人网络环境管理。请遵守所在地法律法规、公司网络政策和代理服务条款。
