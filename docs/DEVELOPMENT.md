# 开发说明

## 技术栈

- Electron
- React
- TypeScript
- Vite
- electron-builder
- Mihomo Windows x64

## 开发环境

建议环境：

- Windows 10 / Windows 11 x64
- Node.js 20 或更高版本
- npm

安装依赖：

```powershell
npm install
```

启动开发模式：

```powershell
npm run dev
```

类型检查：

```powershell
npm run typecheck
```

构建安装包：

```powershell
npm run build
```

## 目录说明

```text
src/main/main.cjs      Electron 主进程、IPC、进程扫描、流量快照
src/main/engine.cjs    Mihomo 配置生成、诊断、启动和停止
src/preload/preload.cjs
                       渲染进程与主进程之间的安全桥接
src/renderer/App.tsx   React 主界面
src/renderer/styles.css
                       界面样式
vendor/mihomo/         内置 Mihomo 可执行文件
```

## 构建说明

`package.json` 中的 electron-builder 配置会生成 NSIS 安装包：

- 安装向导模式：`oneClick: false`
- 支持选择安装路径：`allowToChangeInstallationDirectory: true`
- 请求管理员权限：`requestedExecutionLevel: requireAdministrator`

## 注意事项

- `release/`、`dist/`、`node_modules/` 不应提交到 Git。
- 本项目采用方案 A：提交 `vendor/mihomo/mihomo-windows-amd64-v1.exe`。
- Mihomo 二进制文件较大，后续升级核心时需要同步更新第三方声明和 Release 说明。
- Mihomo 是第三方网络核心，发布时需要说明来源、版本和许可证。详见 [Mihomo 核心说明](MIHOMO.md)。
- Windows TUN 分流需要管理员权限，开发调试启动真实分流时也需要以管理员身份运行。
