# Mihomo 核心说明

ProcessProxy Desk 当前使用 Mihomo 作为第三方网络核心，用于实现 TUN 模式代理、规则路由和连接信息读取。

## Mihomo 是什么

Mihomo 是一个开源代理核心，继承自 Clash.Meta 生态，支持多种代理协议、规则路由、TUN 模式和本地控制接口。

本项目没有重新实现代理核心，而是：

- 根据用户界面配置生成 Mihomo 配置文件。
- 启动随包提供的 Mihomo Windows x64 可执行文件。
- 通过 Mihomo 本地控制接口读取连接和流量信息。
- 使用 Mihomo 的 `PROCESS-NAME` 规则实现按 exe 进程名分流。

## 第三方声明

Mihomo 不属于 ProcessProxy Desk 原创代码。ProcessProxy Desk 与 Mihomo 上游项目不是同一个项目，也不代表 Mihomo 官方发布。

如果仓库或安装包中包含 Mihomo 二进制文件，需要在项目说明和 Release 说明中标明：

- Mihomo 的项目来源。
- Mihomo 的具体版本。
- Mihomo 的许可证。
- 二进制文件是否经过修改。

建议在 Release Notes 中写明类似内容：

```md
本版本随包包含 Mihomo Windows x64 核心，用于 TUN 分流和规则路由。
Mihomo 为第三方开源项目，不属于本项目原创代码。
请以 Mihomo 上游项目许可证为准。
```

## 当前文件位置

当前项目默认从以下路径读取 Mihomo：

```text
vendor/mihomo/mihomo-windows-amd64-v1.exe
```

打包后会放入 Electron 的 `app.asar.unpacked` 目录，供主进程启动。

## 本项目采用的方案

本项目采用方案 A：提交 Mihomo 二进制。

也就是说，仓库中会包含：

```text
vendor/mihomo/mihomo-windows-amd64-v1.exe
```

当前本地文件输出的版本信息为：

```text
Mihomo Meta v1.19.24 windows amd64 with go1.26.2 Mon Apr 20 01:47:25 UTC 2026
Use tags: with_gvisor
```

采用这个方案的原因：

- 克隆仓库后可以直接构建。
- 用户和开发者不需要额外下载核心。
- 仓库会包含第三方二进制文件。
- 需要明确标注来源、版本和许可证。
- 后续升级核心时需要同步更新说明。

如果未来改为不提交 Mihomo 二进制，需要同步更新 README、发布说明和构建流程。

## 用户可替换性

理论上，只要替换后的 Mihomo 可执行文件兼容当前配置格式和控制接口，就可以替换 `vendor/mihomo/mihomo-windows-amd64-v1.exe`。

替换后建议运行：

```powershell
npm run build
```

并在应用中执行“运行诊断”和“启动真实分流”验证。

## 许可证提醒

本项目自身使用 MIT License，但这不代表 Mihomo 也使用同一个许可证。分发包含 Mihomo 的安装包时，需要同时遵守 Mihomo 上游许可证要求。

当前上游 Go 包元数据标注 Mihomo v1.19.24 的许可证为 GPL-3.0。正式发布前仍建议以 Mihomo 上游仓库和 Release 页面为准，并保留相应许可证声明。
