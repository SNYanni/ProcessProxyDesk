# 发布到 GitHub

## 首次上传仓库

在项目根目录执行：

```powershell
git init
git add .
git commit -m "Initial release"
git branch -M main
git remote add origin https://github.com/<your-name>/<your-repo>.git
git push -u origin main
```

把 `<your-name>` 和 `<your-repo>` 替换成你的 GitHub 用户名和仓库名。

## 不建议提交的内容

以下内容已写入 `.gitignore`，通常不要提交：

- `node_modules/`
- `dist/`
- `release/`
- `.env`
- 编辑器临时文件

## 关于 Mihomo 核心

当前项目采用方案 A：提交 Mihomo 二进制。

仓库中应包含：

```text
vendor/mihomo/mihomo-windows-amd64-v1.exe
```

当前本地版本：

```text
Mihomo Meta v1.19.24 windows amd64
```

Release 说明里必须标明 Mihomo 版本、来源和许可证。

Mihomo 是第三方开源核心，不属于本项目原创代码。发布前请阅读 [Mihomo 核心说明](MIHOMO.md)，并确认是否满足上游许可证要求。

## 创建 GitHub Release

1. 确认版本号：

- `package.json` 中的 `version`
- `CHANGELOG.md`
- Release tag，例如 `v0.1.0`

2. 先本地构建：

```powershell
npm run build
```

3. 检查构建产物：

```text
release/ProcessProxy Desk Setup 0.1.0.exe
release/ProcessProxy Desk Setup 0.1.0.exe.blockmap
release/win-unpacked/
```

4. 打开 GitHub 仓库页面。
5. 进入 Releases。
6. 点击 Draft a new release。
7. Tag 填写版本号，例如 `v0.1.0`。
8. Release title 建议填写：

```text
ProcessProxy Desk 0.1.0
```

9. 上传安装包：

```text
release/ProcessProxy Desk Setup 0.1.0.exe
```

10. Release Notes 可以直接使用 [v0.1.0 发布说明](RELEASE_NOTES_v0.1.0.md)。

## Release 应上传什么

建议上传：

- `ProcessProxy Desk Setup 0.1.0.exe`

可选上传：

- `.blockmap` 文件，主要用于后续自动更新场景；当前项目没有实现自动更新时可以不上传。

不建议上传：

- `win-unpacked/` 整个目录。
- `node_modules/`。
- `dist/`。
- 开发过程日志。

## Release 必须说明什么

每个正式 Release 至少说明：

- 支持的系统：Windows x64。
- 安装方式：运行 NSIS 安装包，可选择安装路径。
- 权限要求：启动真实 TUN 分流需要管理员权限。
- 代理要求：用户需要自行配置 HTTP / HTTPS / SOCKS5 代理节点。
- 规则限制：当前按 exe 文件名匹配，不按完整路径匹配。
- 第三方核心：随包包含 Mihomo Windows x64 核心。
- Mihomo 版本、来源和许可证提醒。

## 建议 Release Notes 模板

```md
## ProcessProxy Desk 0.1.0

### 功能
- 支持 Windows x64。
- 支持 HTTP / HTTPS / SOCKS5 代理节点。
- 支持按 exe 进程名配置分流规则。
- 支持内置 Mihomo TUN 真实分流。
- 支持进程流量监控和代理/直连分类显示。

### 安装
- 下载安装包后运行。
- 安装向导支持选择安装路径。
- 启动真实分流需要管理员权限。

### 注意
- 当前规则按 exe 文件名匹配，不按完整路径匹配。
- 使用前需要自行配置可用代理节点。
- 随包包含 Mihomo Windows x64 核心；Mihomo 为第三方开源项目，请以其上游许可证为准。
```
