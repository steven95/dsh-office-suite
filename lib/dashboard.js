/**
 * dsh-office-suite - 办公室动画仪表盘 HTML 生成器
 *
 * 生成一个自包含（无外部依赖）的办公室动画仪表盘：
 * 左侧为办公室场景动画（AI 助手在办公桌前工作），
 * 右侧为数据面板（token 统计 / 工作日志 / 产出物）。
 * 纯函数，可独立测试。
 */

/** HTML 转义，防止注入。 */
export function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** 数字千分位格式化。 */
export function fmt(n) {
  return Number(n ?? 0).toLocaleString('en-US')
}

/** 时间格式化。 */
export function fmtTime(ts) {
  if (!ts) return '—'
  const d = new Date(ts)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleTimeString('zh-CN', { hour12: false })
}

/** 文件类型 → 图标 emoji。 */
export function fileIcon(path) {
  const ext = (path.split('.').pop() || '').toLowerCase()
  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico'].includes(ext)) return '🖼'
  if (['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(ext)) return '🎬'
  if (['mp3', 'wav', 'flac', 'ogg', 'm4a'].includes(ext)) return '🎵'
  if (['pdf'].includes(ext)) return '📕'
  if (['doc', 'docx'].includes(ext)) return '📘'
  if (['xls', 'xlsx', 'csv'].includes(ext)) return '📊'
  if (['zip', 'tar', 'gz', '7z', 'rar'].includes(ext)) return '🗜'
  if (['html', 'htm'].includes(ext)) return '🌐'
  if (['js', 'ts', 'py', 'java', 'go', 'rs', 'c', 'cpp', 'sh', 'css', 'json', 'yaml', 'yml', 'md', 'txt'].includes(ext)) return '📄'
  return '📁'
}

/** 日志类型 → 颜色。 */
export function logColor(type) {
  switch (type) {
    case 'turn/start': return 'var(--c-turn)'
    case 'turn/end': return 'var(--c-turn)'
    case 'step/start': return 'var(--c-step)'
    case 'step/end': return 'var(--c-step)'
    case 'user/message': return 'var(--c-user)'
    case 'assistant/message': return 'var(--c-assistant)'
    case 'tool/call': return 'var(--c-tool)'
    case 'tool/result': return 'var(--c-tool)'
    default: return 'var(--c-muted)'
  }
}

/** 日志类型 → 徽标文字。 */
export function logBadge(type) {
  switch (type) {
    case 'turn/start': return 'TURN'
    case 'turn/end': return 'TURN'
    case 'step/start': return 'STEP'
    case 'step/end': return 'STEP'
    case 'user/message': return 'USER'
    case 'assistant/message': return 'AI'
    case 'tool/call': return 'TOOL'
    case 'tool/result': return 'TOOL'
    default: return 'EVT'
  }
}

/**
 * 生成办公室动画仪表盘 HTML。
 * @param {object} data - { tokens, log, deliverables, sessionId, generatedAt }
 * @returns {string} 完整 HTML 文档
 */
export function renderDashboard(data) {
  const tokens = data.tokens || {}
  const log = data.log || []
  const deliverables = data.deliverables || []
  const sessionId = data.sessionId || '—'
  const generatedAt = data.generatedAt || Date.now()

  const total = tokens.totalTokens ?? 0
  const input = tokens.inputTokens ?? 0
  const output = tokens.outputTokens ?? 0
  const cacheRead = tokens.cacheReadTokens ?? 0
  const cacheWrite = tokens.cacheWriteTokens ?? 0
  const reasoning = tokens.reasoningTokens ?? 0
  const turns = tokens.turns ?? 0
  const steps = tokens.steps ?? 0
  const toolCalls = tokens.toolCalls ?? 0

  // 进度条占比（相对 total，避免除零）
  const pct = (v) => (total > 0 ? Math.round((v / total) * 100) : 0)

  const logRows = log
    .slice()
    .reverse()
    .map((e) => {
      const color = logColor(e.type)
      const badge = logBadge(e.type)
      const files = e.files && e.files.length ? `<div class="log-files">${e.files.map((f) => `<span class="chip">${fileIcon(f)} ${esc(f)}</span>`).join('')}</div>` : ''
      const usage = e.usage ? `<span class="log-usage">in ${fmt(e.usage.inputTokens)} · out ${fmt(e.usage.outputTokens)}</span>` : ''
      return `<div class="log-row">
        <span class="log-time">${fmtTime(e.time)}</span>
        <span class="log-badge" style="--bc:${color}">${badge}</span>
        <span class="log-text">${esc(e.summary)}${usage}</span>
        ${files}
      </div>`
    })
    .join('')

  const fileRows = deliverables
    .map((f) => `<a class="file-row" href="file://${esc(f.path)}" title="${esc(f.path)}">
      <span class="file-ico">${fileIcon(f.path)}</span>
      <span class="file-name">${esc(f.path.split('/').pop())}</span>
      <span class="file-count">×${f.count}</span>
    </a>`)
    .join('')

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>🏢 办公室 · Office Dashboard</title>
<style>
  :root {
    --bg: #0f172a;
    --panel: rgba(30, 41, 59, 0.85);
    --panel-border: rgba(148, 163, 184, 0.15);
    --text: #e2e8f0;
    --muted: #94a3b8;
    --accent: #38bdf8;
    --c-turn: #f59e0b;
    --c-step: #a78bfa;
    --c-user: #34d399;
    --c-assistant: #38bdf8;
    --c-tool: #f472b6;
    --c-muted: #64748b;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
    background: radial-gradient(1200px 800px at 20% 0%, #1e293b 0%, var(--bg) 55%);
    color: var(--text);
    min-height: 100vh;
    padding: 24px;
  }
  .wrap { max-width: 1200px; margin: 0 auto; }
  header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 16px 20px; margin-bottom: 20px;
    background: var(--panel); border: 1px solid var(--panel-border);
    border-radius: 16px; backdrop-filter: blur(8px);
  }
  header h1 { font-size: 20px; font-weight: 700; letter-spacing: 0.5px; }
  header h1 .dot { color: var(--accent); animation: blink 1.2s infinite; }
  header .meta { color: var(--muted); font-size: 13px; text-align: right; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
  @media (max-width: 900px) { .grid { grid-template-columns: 1fr; } }
  .panel {
    background: var(--panel); border: 1px solid var(--panel-border);
    border-radius: 16px; padding: 20px; backdrop-filter: blur(8px);
  }
  .panel h2 { font-size: 15px; font-weight: 600; margin-bottom: 14px; color: var(--accent); display: flex; align-items: center; gap: 8px; }
  .panel h2 .count { margin-left: auto; color: var(--muted); font-weight: 400; font-size: 12px; }

  /* ---------- 办公室场景 ---------- */
  .office { position: relative; height: 420px; overflow: hidden; border-radius: 12px; background: linear-gradient(180deg, #1e3a5f 0%, #0f2a4a 45%, #1a2f1f 100%); }
  .office .floor { position: absolute; left: 0; right: 0; bottom: 0; height: 34%; background: linear-gradient(180deg, #2d4a2d 0%, #1f3a1f 100%); }
  .office .window { position: absolute; top: 24px; right: 30px; width: 130px; height: 90px; border-radius: 8px; background: linear-gradient(180deg, #7dd3fc 0%, #bae6fd 60%, #fef3c7 100%); border: 4px solid #334155; overflow: hidden; }
  .office .window::after { content: ''; position: absolute; inset: 0; background: linear-gradient(120deg, transparent 40%, rgba(255,255,255,0.5) 50%, transparent 60%); animation: shine 4s infinite; }
  .office .plant { position: absolute; left: 18px; bottom: 34%; width: 40px; height: 60px; }
  .office .plant .pot { position: absolute; bottom: 0; width: 34px; height: 18px; background: #b45309; border-radius: 4px 4px 8px 8px; left: 3px; }
  .office .plant .leaf { position: absolute; bottom: 16px; width: 14px; height: 34px; background: #22c55e; border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%; transform-origin: bottom; animation: sway 3s ease-in-out infinite; }
  .office .plant .leaf.l1 { left: 2px; transform: rotate(-18deg); }
  .office .plant .leaf.l2 { left: 13px; transform: rotate(0deg); animation-delay: 0.4s; }
  .office .plant .leaf.l3 { left: 24px; transform: rotate(18deg); animation-delay: 0.8s; }
  .office .desk { position: absolute; left: 50%; bottom: 34%; transform: translateX(-50%); width: 300px; height: 16px; background: linear-gradient(180deg, #8b5a2b, #6b4423); border-radius: 4px; }
  .office .desk::before { content: ''; position: absolute; left: 20px; right: 20px; top: 16px; height: 60px; background: linear-gradient(180deg, #6b4423, #4a2f18); }
  .office .monitor { position: absolute; left: 50%; bottom: calc(34% + 16px); transform: translateX(-50%); width: 150px; height: 96px; background: #0b1220; border: 6px solid #1e293b; border-radius: 8px; overflow: hidden; }
  .office .monitor .screen { position: absolute; inset: 4px; background: #0f172a; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 4px; }
  .office .monitor .screen .bar { width: 70%; height: 6px; border-radius: 3px; background: linear-gradient(90deg, var(--accent), #818cf8); animation: pulse 1.6s infinite; }
  .office .monitor .screen .bar.b2 { width: 50%; animation-delay: 0.3s; }
  .office .monitor .screen .bar.b3 { width: 60%; animation-delay: 0.6s; }
  .office .monitor .stand { position: absolute; left: 50%; bottom: -14px; transform: translateX(-50%); width: 24px; height: 14px; background: #1e293b; }
  .office .agent { position: absolute; left: 50%; bottom: calc(34% + 16px); transform: translateX(-120px); width: 90px; height: 120px; }
  .office .agent .body { position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: 56px; height: 70px; background: linear-gradient(180deg, #38bdf8, #0284c7); border-radius: 18px 18px 10px 10px; }
  .office .agent .head { position: absolute; bottom: 62px; left: 50%; transform: translateX(-50%); width: 44px; height: 44px; background: #fcd9b8; border-radius: 50%; }
  .office .agent .head .eye { position: absolute; top: 18px; width: 6px; height: 6px; background: #1e293b; border-radius: 50%; }
  .office .agent .head .eye.l { left: 12px; }
  .office .agent .head .eye.r { right: 12px; }
  .office .agent .head .smile { position: absolute; bottom: 10px; left: 50%; transform: translateX(-50%); width: 14px; height: 7px; border-bottom: 2px solid #1e293b; border-radius: 0 0 14px 14px; }
  .office .agent .arm { position: absolute; bottom: 18px; width: 10px; height: 34px; background: #0284c7; border-radius: 6px; }
  .office .agent .arm.l { left: 4px; transform-origin: top; animation: type 0.5s infinite alternate; }
  .office .agent .arm.r { right: 4px; transform-origin: top; animation: type 0.5s infinite alternate-reverse; }
  .office .agent .bubble { position: absolute; top: -34px; left: 50%; transform: translateX(-50%); background: #fff; color: #0f172a; font-size: 12px; padding: 6px 10px; border-radius: 12px; white-space: nowrap; animation: bob 2s infinite; }
  .office .agent .bubble::after { content: ''; position: absolute; bottom: -6px; left: 50%; transform: translateX(-50%); border: 6px solid transparent; border-top-color: #fff; border-bottom: 0; }
  .office .clock { position: absolute; top: 24px; left: 30px; width: 64px; height: 64px; border-radius: 50%; background: #f8fafc; border: 4px solid #334155; }
  .office .clock .h { position: absolute; left: 50%; top: 50%; width: 3px; height: 16px; background: #1e293b; transform-origin: 50% 0; animation: clock-h 60s linear infinite; }
  .office .clock .m { position: absolute; left: 50%; top: 50%; width: 2px; height: 22px; background: #475569; transform-origin: 50% 0; animation: clock-m 6s linear infinite; }
  .office .clock .pin { position: absolute; left: 50%; top: 50%; width: 6px; height: 6px; background: #ef4444; border-radius: 50%; transform: translate(-50%, -50%); }
  .office .status { position: absolute; left: 50%; bottom: 8%; transform: translateX(-50%); background: rgba(0,0,0,0.5); color: #a7f3d0; font-size: 12px; padding: 6px 14px; border-radius: 20px; white-space: nowrap; }
  .office .status .pulse { display: inline-block; width: 8px; height: 8px; background: #34d399; border-radius: 50%; margin-right: 6px; animation: blink 1s infinite; }

  /* ---------- 数据面板 ---------- */
  .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px; }
  .stat { background: rgba(15, 23, 42, 0.6); border: 1px solid var(--panel-border); border-radius: 12px; padding: 14px; }
  .stat .label { color: var(--muted); font-size: 12px; margin-bottom: 6px; }
  .stat .value { font-size: 24px; font-weight: 700; font-variant-numeric: tabular-nums; }
  .stat .value small { font-size: 12px; color: var(--muted); font-weight: 400; }
  .stat .bar { margin-top: 8px; height: 6px; background: rgba(148, 163, 184, 0.2); border-radius: 3px; overflow: hidden; }
  .stat .bar i { display: block; height: 100%; border-radius: 3px; background: linear-gradient(90deg, var(--accent), #818cf8); animation: grow 1.2s ease-out; }
  .token-breakdown { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-bottom: 20px; }
  .token-cell { background: rgba(15, 23, 42, 0.6); border: 1px solid var(--panel-border); border-radius: 10px; padding: 10px; text-align: center; }
  .token-cell .v { font-size: 16px; font-weight: 600; font-variant-numeric: tabular-nums; }
  .token-cell .k { font-size: 11px; color: var(--muted); margin-top: 4px; }
  .log-list { max-height: 300px; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; padding-right: 4px; }
  .log-row { display: flex; align-items: flex-start; gap: 8px; font-size: 13px; padding: 6px 8px; background: rgba(15, 23, 42, 0.5); border-radius: 8px; }
  .log-time { color: var(--muted); font-size: 11px; white-space: nowrap; padding-top: 1px; font-variant-numeric: tabular-nums; }
  .log-badge { flex-shrink: 0; font-size: 10px; font-weight: 700; color: var(--bc); border: 1px solid var(--bc); border-radius: 4px; padding: 1px 5px; }
  .log-text { flex: 1; word-break: break-all; }
  .log-usage { color: var(--muted); font-size: 11px; margin-left: 6px; }
  .log-files { flex-basis: 100%; display: flex; flex-wrap: wrap; gap: 4px; }
  .chip { font-size: 11px; background: rgba(56, 189, 248, 0.12); color: #7dd3fc; border-radius: 4px; padding: 1px 6px; }
  .file-list { display: flex; flex-direction: column; gap: 6px; max-height: 300px; overflow-y: auto; }
  .file-row { display: flex; align-items: center; gap: 10px; padding: 8px 10px; background: rgba(15, 23, 42, 0.5); border-radius: 8px; text-decoration: none; color: var(--text); transition: background 0.2s; }
  .file-row:hover { background: rgba(56, 189, 248, 0.12); }
  .file-ico { font-size: 18px; }
  .file-name { flex: 1; font-size: 13px; word-break: break-all; }
  .file-count { color: var(--muted); font-size: 11px; }
  .empty { color: var(--muted); font-size: 13px; text-align: center; padding: 30px 0; }
  .footer { text-align: center; color: var(--muted); font-size: 12px; margin-top: 20px; }

  @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
  @keyframes pulse { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }
  @keyframes shine { 0% { transform: translateX(-100%); } 60%, 100% { transform: translateX(200%); } }
  @keyframes sway { 0%, 100% { transform: rotate(-4deg); } 50% { transform: rotate(4deg); } }
  @keyframes type { from { transform: rotate(-14deg); } to { transform: rotate(10deg); } }
  @keyframes bob { 0%, 100% { transform: translateX(-50%) translateY(0); } 50% { transform: translateX(-50%) translateY(-4px); } }
  @keyframes clock-h { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  @keyframes clock-m { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  @keyframes grow { from { width: 0; } }
  @keyframes countup { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
  .stat, .token-cell, .log-row, .file-row { animation: countup 0.5s ease-out both; }
</style>
</head>
<body>
<div class="wrap">
  <header>
    <h1><span class="dot">●</span> 办公室 · Office Dashboard</h1>
    <div class="meta">
      <div>Session: <b>${esc(sessionId)}</b></div>
      <div>生成于 ${new Date(generatedAt).toLocaleString('zh-CN', { hour12: false })}</div>
    </div>
  </header>

  <div class="grid">
    <!-- 办公室场景 -->
    <div class="panel">
      <h2>🏢 办公室 <span class="count">AI 助手工作中</span></h2>
      <div class="office">
        <div class="window"></div>
        <div class="clock"><div class="h"></div><div class="m"></div><div class="pin"></div></div>
        <div class="plant"><div class="leaf l1"></div><div class="leaf l2"></div><div class="leaf l3"></div><div class="pot"></div></div>
        <div class="desk"></div>
        <div class="monitor">
          <div class="screen">
            <div class="bar"></div><div class="bar b2"></div><div class="bar b3"></div>
          </div>
          <div class="stand"></div>
        </div>
        <div class="agent">
          <div class="bubble">正在处理任务…</div>
          <div class="head"><div class="eye l"></div><div class="eye r"></div><div class="smile"></div></div>
          <div class="body"></div>
          <div class="arm l"></div><div class="arm r"></div>
        </div>
        <div class="status"><span class="pulse"></span>${turns} 回合 · ${steps} 步骤 · ${toolCalls} 次工具调用</div>
      </div>
    </div>

    <!-- 数据面板 -->
    <div class="panel">
      <h2>📊 Token 统计 <span class="count">累计 ${fmt(total)} tokens</span></h2>
      <div class="stats">
        <div class="stat"><div class="label">总 Token</div><div class="value">${fmt(total)}</div><div class="bar"><i style="width:100%"></i></div></div>
        <div class="stat"><div class="label">输入</div><div class="value">${fmt(input)}</div><div class="bar"><i style="width:${pct(input)}%"></i></div></div>
        <div class="stat"><div class="label">输出</div><div class="value">${fmt(output)}</div><div class="bar"><i style="width:${pct(output)}%"></i></div></div>
      </div>
      <div class="token-breakdown">
        <div class="token-cell"><div class="v">${fmt(cacheRead)}</div><div class="k">缓存读</div></div>
        <div class="token-cell"><div class="v">${fmt(cacheWrite)}</div><div class="k">缓存写</div></div>
        <div class="token-cell"><div class="v">${fmt(reasoning)}</div><div class="k">推理</div></div>
        <div class="token-cell"><div class="v">${turns}</div><div class="k">回合</div></div>
        <div class="token-cell"><div class="v">${steps}</div><div class="k">步骤</div></div>
      </div>
    </div>

    <div class="panel">
      <h2>📋 工作日志 <span class="count">${log.length} 条</span></h2>
      <div class="log-list">
        ${logRows || '<div class="empty">暂无日志</div>'}
      </div>
    </div>

    <div class="panel">
      <h2>📦 产出物 <span class="count">${deliverables.length} 个</span></h2>
      <div class="file-list">
        ${fileRows || '<div class="empty">暂无产出物</div>'}
      </div>
    </div>
  </div>

  <div class="footer">dsh-office-suite · 办公室动画仪表盘 · 由 DeepSeek Harness 生成</div>
</div>
</body>
</html>`
}
