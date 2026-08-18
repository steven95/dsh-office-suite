# dsh-office-suite · 办公室动画仪表盘

一个 DeepSeek Harness（DSH）插件：把「这次会话干了什么、产出了什么、花了多少 token」折叠成一份**可独立打开的办公室动画仪表盘 HTML**。

与 [dsh-office](https://www.npmjs.com/package/dsh-office)（实时精灵办公室面板）差异化：本插件聚焦**会话复盘**——任务收尾时一键生成可视化工作汇报，含工作日志、产出物、token 统计与办公室场景动画。

## 功能

| 能力 | 说明 |
| --- | --- |
| 📋 工作日志 | 从 session 事件流折叠回合/步骤/用户消息/工具调用/助手消息，含工具产出文件与 token 用量 |
| 📦 产出物 | 提取成功写入的文件路径，去重保序，记录出现次数 |
| 📊 Token 统计 | 输入/输出/缓存读/缓存写/推理分项 + 回合/步骤/工具调用次数 |
| 🏢 办公室动画 | 自包含 HTML：AI 助手在办公桌前打字、思考气泡、时钟走动、数据进度条动画 |
| 🔍 产出物预览 | 文本文件返回内容摘要，图片/音视频/压缩包返回类型与大小 |

## 工具

| 工具 | 说明 |
| --- | --- |
| `office_dashboard` | 生成办公室动画仪表盘 HTML 并写入指定目录 |
| `office_log` | 查询工作日志（limit 可调） |
| `office_deliverables` | 查询产出物列表 |
| `office_tokens` | 查询 token 统计 |
| `office_preview` | 预览产出物文件 |

## 安装

```bash
dsh plugin add dsh-office-suite
```

或手动在 profile 的 `package.json` 的 `dependencies` 与 `dsh.profile.bundles` 中加入 `dsh-office-suite`，并确保 `cordis.patch.yml` 包含：

```yaml
- insert:
    - id: office-suite
      name: dsh-office-suite
      inject: [tools]
```

## 使用

在会话中让助手调用：

```
生成办公室仪表盘，输出到 ~/Desktop
```

即可得到 `~/Desktop/office-dashboard.html`，用浏览器打开即可查看动画仪表盘。

## 架构

```
index.js                插件入口：注册投影单元 + 5 个工具
lib/log.js              工作日志投影单元（事件折叠）
lib/deliverables.js     产出物投影单元（文件路径提取）
lib/tokens.js           token 统计投影单元（usage 折叠）
lib/dashboard.js        办公室动画仪表盘 HTML 生成器（纯函数）
lib/preview.js          产出物预览（纯函数）
cordis.patch.yml        bundle 声明
```

- 投影单元通过 `ctx.inject(['sessionProjections'], ...)` 可选注入，headless 环境不受影响。
- 业务逻辑全部为纯函数，可独立测试，不依赖 DSH 运行时。

## License

MIT
