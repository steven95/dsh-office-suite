/**
 * dsh-office-suite - 办公室动画仪表盘插件
 *
 * 服务端 cordis 插件：注册三个投影单元（工作日志 / 产出物 / token 统计），
 * 并暴露 5 个工具：office_dashboard / office_log / office_deliverables /
 * office_tokens / office_preview。
 *
 * 与 dsh-office（实时精灵办公室面板）差异化：聚焦「这次会话干了什么、
 * 产出了什么、花了多少 token」，一键生成可独立打开的动画办公室 HTML。
 */

import { defineTool } from '@deepseek-ai/dsh-tools'
import fs from 'node:fs'
import path from 'node:path'
import { officeLogDefinition } from './lib/log.js'
import { officeDeliverablesDefinition } from './lib/deliverables.js'
import { officeTokensDefinition } from './lib/tokens.js'
import { renderDashboard } from './lib/dashboard.js'
import { buildPreview, previewKind } from './lib/preview.js'

export const name = 'dsh-office-suite'

function json(res, status, value) {
  const body = JSON.stringify(value)
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
  })
  res.end(body)
}

function requireMethod(req, res, method) {
  if (req.method !== method) {
    res.writeHead(405, { Allow: method })
    res.end()
    return false
  }
  return true
}

export function apply(ctx) {
  // ---------- 投影单元（可选能力：headless 无 registry 时不受影响） ----------
  ctx.inject(['sessionProjections'], (projectionCtx) => {
    projectionCtx.sessionProjections.register(officeLogDefinition)
    projectionCtx.sessionProjections.register(officeDeliverablesDefinition)
    projectionCtx.sessionProjections.register(officeTokensDefinition)
  })

  // ---------- 会话追踪 + HTTP API（webServer 可选能力，headless 无影响） ----------
  const webServer = ctx.reflect.get('webServer', false)
  console.log('[office-suite] webServer =', webServer ? 'available' : 'MISSING', '| sessionProjections =', ctx.reflect.get('sessionProjections', false) ? 'available' : 'MISSING')
  if (webServer) {
    let recentSession = null
    const disposeEvents = [
      ctx.on('session/event', (session) => {
        recentSession = session
      }),
      ctx.on('session/disposed', (session) => {
        if (recentSession === session) recentSession = null
      }),
    ]
    const route = {
      kind: 'exact',
      path: '/api/office-suite/state',
      handler: (req, res) => {
        if (!requireMethod(req, res, 'GET')) return
        const projections = ctx.reflect.get('sessionProjections', false)
        let state = {
          ok: true,
          sessionId: null,
          tokens: {},
          log: [],
          deliverables: [],
          updatedAt: Date.now(),
        }
        if (recentSession && projections) {
          try {
            const snap = projections.snapshot(recentSession)
            const values = snap?.values ?? {}
            state = {
              ok: true,
              sessionId: recentSession.id ?? null,
              tokens: values.officeTokens ?? {},
              log: values.officeLog?.entries ?? [],
              deliverables: values.officeDeliverables?.files ?? [],
              updatedAt: Date.now(),
            }
          } catch {
            /* 保持默认 state */
          }
        }
        json(res, 200, state)
      },
    }
    ctx.effect(() => {
      const disposeRoute = webServer.register(route)
      return () => {
        for (const off of disposeEvents) off()
        disposeRoute()
      }
    }, 'office-suite: http api')
  }

  // ---------- 读取当前 session 的投影快照 ----------
  function readSnapshot(exec) {
    const session = exec?.agent?.session
    if (!session) return null
    const projections = ctx.reflect.get('sessionProjections', false)
    if (!projections) return null
    try {
      return projections.snapshot(session)
    } catch {
      return null
    }
  }

  function valuesOf(exec) {
    const snap = readSnapshot(exec)
    return snap?.values ?? {}
  }

  // ---------- 工具：office_dashboard ----------
  ctx.tools.register(defineTool({
    name: 'office_dashboard',
    description: '生成办公室动画仪表盘 HTML（工作日志 + 产出物 + token 统计 + 办公室场景动画），写入指定目录并返回文件路径。适合在任务收尾时生成一份可视化工作汇报。',
    parameters: {
      dir: { type: 'string', required: true, description: '输出目录（绝对路径）' },
    },
    output: {
      schema: { type: 'object', additionalProperties: true },
      render: (_args, value) => [{ type: 'text', text: value.report || JSON.stringify(value, null, 2) }],
    },
    async execute(args, exec) {
      const values = valuesOf(exec)
      const sessionId = exec?.agent?.session?.id ?? 'unknown'
      const html = renderDashboard({
        tokens: values.officeTokens ?? {},
        log: values.officeLog?.entries ?? [],
        deliverables: values.officeDeliverables?.files ?? [],
        sessionId,
        generatedAt: Date.now(),
      })
      const dir = args.dir || process.cwd()
      const outPath = path.join(dir, 'office-dashboard.html')
      try {
        fs.mkdirSync(dir, { recursive: true })
        fs.writeFileSync(outPath, html, 'utf8')
        return {
          ok: true,
          path: outPath,
          report: `办公室仪表盘已生成：${outPath}（${html.length} 字节）`,
        }
      } catch (err) {
        return { ok: false, error: String(err?.message ?? err) }
      }
    },
  }))

  // ---------- 工具：office_log ----------
  ctx.tools.register(defineTool({
    name: 'office_log',
    description: '查询当前会话的工作日志（回合/步骤/用户消息/工具调用/助手消息），返回按时间正序的条目列表。',
    parameters: {
      limit: { type: 'integer', required: true, description: '返回条数上限' },
    },
    output: {
      schema: { type: 'object', additionalProperties: true },
      render: (_args, value) => [{ type: 'text', text: value.report || JSON.stringify(value, null, 2) }],
    },
    async execute(args, exec) {
      const values = valuesOf(exec)
      const entries = values.officeLog?.entries ?? []
      const limit = Math.max(1, Math.min(200, args.limit ?? 50))
      const list = entries.slice(-limit)
      return {
        ok: true,
        total: entries.length,
        entries: list,
        report: `工作日志共 ${entries.length} 条，返回最近 ${list.length} 条。`,
      }
    },
  }))

  // ---------- 工具：office_deliverables ----------
  ctx.tools.register(defineTool({
    name: 'office_deliverables',
    description: '查询当前会话的产出物列表（成功写入的文件路径，去重保序，含出现次数）。',
    parameters: {},
    output: {
      schema: { type: 'object', additionalProperties: true },
      render: (_args, value) => [{ type: 'text', text: value.report || JSON.stringify(value, null, 2) }],
    },
    async execute(_args, exec) {
      const values = valuesOf(exec)
      const files = values.officeDeliverables?.files ?? []
      return {
        ok: true,
        count: files.length,
        files,
        report: files.length
          ? `产出物 ${files.length} 个：\n${files.map((f) => `- ${f.path}（×${f.count}）`).join('\n')}`
          : '当前会话暂无产出物。',
      }
    },
  }))

  // ---------- 工具：office_tokens ----------
  ctx.tools.register(defineTool({
    name: 'office_tokens',
    description: '查询当前会话的 token 统计（输入/输出/缓存读/缓存写/推理分项 + 回合/步骤/工具调用次数）。',
    parameters: {},
    output: {
      schema: { type: 'object', additionalProperties: true },
      render: (_args, value) => [{ type: 'text', text: value.report || JSON.stringify(value, null, 2) }],
    },
    async execute(_args, exec) {
      const values = valuesOf(exec)
      const t = values.officeTokens ?? {}
      const report = [
        `Token 统计：输入 ${t.inputTokens ?? 0} · 输出 ${t.outputTokens ?? 0} · 缓存读 ${t.cacheReadTokens ?? 0} · 缓存写 ${t.cacheWriteTokens ?? 0} · 推理 ${t.reasoningTokens ?? 0} · 总计 ${t.totalTokens ?? 0}`,
        `回合 ${t.turns ?? 0} · 步骤 ${t.steps ?? 0} · 工具调用 ${t.toolCalls ?? 0}`,
      ].join('\n')
      return { ok: true, ...t, report }
    },
  }))

  // ---------- 工具：office_preview ----------
  ctx.tools.register(defineTool({
    name: 'office_preview',
    description: '预览产出物文件：文本文件返回内容摘要（前 40 行），图片/音视频/压缩包返回类型与大小信息。',
    parameters: {
      path: { type: 'string', required: true, description: '要预览的文件绝对路径' },
    },
    output: {
      schema: { type: 'object', additionalProperties: true },
      render: (_args, value) => [{ type: 'text', text: value.report || JSON.stringify(value, null, 2) }],
    },
    async execute(args) {
      const target = args.path
      try {
        const stat = fs.statSync(target)
        if (!stat.isFile()) return { ok: false, error: `不是文件：${target}` }
        const kind = previewKind(target)
        let content = null
        if (kind === 'text') {
          content = fs.readFileSync(target, 'utf8')
        }
        const result = buildPreview(target, stat, content)
        return { ok: true, ...result, report: `[${result.kindLabel}] ${target}\n${result.preview}` }
      } catch (err) {
        return { ok: false, error: String(err?.message ?? err) }
      }
    },
  }))
}
