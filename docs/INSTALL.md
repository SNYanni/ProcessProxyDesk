# 安装说明

## 普通用户安装

1. 下载 `ProcessProxy Desk Setup 0.1.0.exe`。
2. 双击运行安装包。
3. 安装向导会显示安装路径选择页，可以选择默认路径，也可以改到其他目录。
4. 完成安装后，从桌面快捷方式或开始菜单启动。

## 是否需要额外依赖

不需要提前安装 Node.js、Electron 或 Mihomo。安装包已经包含运行所需文件。

需要注意：

- 程序面向 Windows x64。
- 启动真实 TUN 分流需要管理员权限。
- 需要用户自行提供可用代理节点。
- Windows 安全提示或 UAC 弹窗出现时，需要允许程序运行。

## 免安装运行

开发者也可以使用 `release/win-unpacked/ProcessProxy Desk.exe` 直接运行。这个目录是构建出的免安装版本，适合本地测试，不适合作为普通用户的主要分发方式。

## 卸载

通过 Windows“设置 > 应用 > 已安装的应用”卸载 ProcessProxy Desk，或使用安装目录中的卸载程序。

卸载不会主动删除所有用户配置。如果需要彻底清理，可以删除 Electron 的用户数据目录中与 ProcessProxy Desk 相关的配置。
