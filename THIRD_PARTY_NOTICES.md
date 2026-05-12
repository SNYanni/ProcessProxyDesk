# 第三方声明

本项目包含或使用以下第三方组件。第三方组件不属于 ProcessProxy Desk 原创代码，其版权和许可证归各自上游项目所有。

## Mihomo

- 名称：Mihomo
- 用途：代理核心、TUN 分流、规则路由、本地连接信息读取
- 上游项目：https://github.com/MetaCubeX/mihomo
- 本项目内置文件：`vendor/mihomo/mihomo-windows-amd64-v1.exe`
- 当前本地版本：

```text
Mihomo Meta v1.19.24 windows amd64 with go1.26.2 Mon Apr 20 01:47:25 UTC 2026
Use tags: with_gvisor
```

- 许可证：上游 Go 包元数据标注为 GPL-3.0。正式发布前请以 Mihomo 上游仓库、Release 页面和许可证文件为准。
- 是否修改：本项目未修改 Mihomo 源代码；当前仅随包分发其 Windows x64 可执行文件。

## 分发提醒

本项目自身使用 MIT License，但随包包含的 Mihomo 不受本项目 MIT License 覆盖。发布包含 Mihomo 的安装包或仓库时，需要同时遵守 Mihomo 上游许可证要求。

如果后续替换、升级或移除 Mihomo 二进制文件，请同步更新：

- `README.md`
- `docs/MIHOMO.md`
- `docs/PUBLISHING.md`
- `SECURITY.md`
- 本文件
