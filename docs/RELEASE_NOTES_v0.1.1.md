# ProcessProxy Desk 0.1.1

这是一个兼容性修复版本。

## 修复

- 将 Mihomo DNS 增强模式从 `fake-ip` 调整为 `redir-host`。
- 降低未配置进程和游戏客户端在 TUN 模式下出现连接异常的概率。

## 背景说明

未加入代理规则的进程默认会命中 `MATCH,DIRECT`，也就是不走代理。但在 TUN 模式下，系统流量仍会先经过 Mihomo TUN 内核再直连。

旧版本使用 `fake-ip` DNS 模式，部分游戏客户端可能无法正确处理虚拟 IP，从而出现服务器连接失败。此版本改为更保守的 `redir-host`，对游戏和对网络环境敏感的软件更友好。

## 下载

- 安装版：`ProcessProxy Desk Setup 0.1.1.exe`
- 免安装版：`ProcessProxy Desk 0.1.1 Portable.zip`

## 仍需注意

- 当前规则仍按 exe 文件名匹配，不按完整路径匹配。
- 启动真实 TUN 分流仍需要管理员权限。
- 用户仍需要自行配置可用的 HTTP / HTTPS / SOCKS5 代理节点。
