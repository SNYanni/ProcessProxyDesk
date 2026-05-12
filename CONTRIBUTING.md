# 贡献指南

感谢你愿意改进 ProcessProxy Desk。

## 提交 Issue

请尽量包含：

- Windows 版本。
- 软件版本。
- 问题复现步骤。
- 期望结果和实际结果。
- 如果是分流问题，请说明代理类型、进程名和规则配置。

不要在 Issue 中提交代理账号、密码、Token 或其他敏感信息。

## 提交 Pull Request

建议流程：

1. Fork 仓库。
2. 创建功能分支。
3. 修改代码或文档。
4. 运行检查：

```powershell
npm run typecheck
npm run build
```

5. 提交 Pull Request，并说明改动内容和验证方式。

## 代码风格

- 尽量保持现有代码结构和命名风格。
- UI 改动需要考虑不同窗口大小下的显示效果。
- 涉及网络接管、进程规则、流量统计的改动需要谨慎说明风险。
- 不要提交 `node_modules/`、`dist/`、`release/`。

## 文档

如果改动了用户可见功能，请同步更新：

- `README.md`
- `docs/USAGE.md`
- `docs/FAQ.md`
- 必要时更新 `CHANGELOG.md`
