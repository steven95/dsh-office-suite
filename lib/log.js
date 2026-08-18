/**
 * dsh-office-suite - 工作日志投影单元
 *
 * 从 session 事件流折叠出人类可读的工作日志：
 * 每个 turn / step / 用户消息 / 工具调用 / 工具结果 / 助手消息 各记一条。
 * 纯函数，可独立测试。
 */

/** 日志条数上限，防止 state 无限膨胀（投影值会随每个事件下发到客户端）。 */
export const MAX_ENTRIES = 200

/** 截断长文本为单行摘要。 */
export function summarize(text, max = 120) {
  if (typeof text !== 'string') return ''
  const oneLine = text.replace(/\s+/g, ' ').trim()
  return oneLine.length > max ? oneLine.slice(0, max) + '…' : oneLine
}

/** 从任意对象里提取文件路径（产出物/预览用）。 */
export function extractPaths(value) {
  const out = []
  if (value == null) return out
  if (typeof value === 'string') {
    if (/\.(md|txt|json|yaml|yml|html|js|ts|py|css|png|jpg|jpeg|gif|svg|pdf|docx|xlsx|csv|zip|mp4|webm|mov)$/i.test(value)) {
      out.push(value)
    }
    return out
  }
  if (Array.isArray(value)) {
    for (const item of value) out.push(...extractPaths(item))
    return out
  }
  if (typeof value === 'object') {
    for (const key of ['path', 'file', 'filePath', 'location', 'locations', 'output', 'target', 'dest']) {
      if (key in value) out.push(...extractPaths(value[key]))
    }
    for (const v of Object.values(value)) {
      if (typeof v === 'string' && /\.(md|txt|json|yaml|yml|html|js|ts|py|css|png|jpg|jpeg|gif|svg|pdf|docx|xlsx|csv|zip|mp4|webm|mov)$/i.test(v)) {
        out.push(v)
      }
    }
  }
  return out
}

/** 从 tool/result 的 message 里提取产出物路径。 */
export function extractDeliverables(message) {
  const paths = []
  if (!message || typeof message !== 'object') return paths
  // 直接字段
  for (const key of ['locations', 'location', 'path', 'file', 'filePath', 'output', 'target']) {
    if (key in message) paths.push(...extractPaths(message[key]))
  }
  // 嵌套在 content / result / data 里
  for (const key of ['content', 'result', 'data', 'value']) {
    if (key in message) paths.push(...extractPaths(message[key]))
  }
  // 去重保序
  return [...new Set(paths)]
}

/** 投影单元定义。 */
export const officeLogDefinition = {
  key: 'officeLog',
  schema: {
    type: 'object',
    additionalProperties: true,
  },
  init: () => ({ entries: [], openStep: null, pendingCalls: {} }),
  apply: (state, event) => {
    const { seq, time, type, data } = event
    const push = (entry) => {
      const entries = [...state.entries, { seq, time, type, ...entry }]
      return entries.length > MAX_ENTRIES ? entries.slice(entries.length - MAX_ENTRIES) : entries
    }

    switch (type) {
      case 'turn/start': {
        return { ...state, entries: push({ turn: data.turn, summary: `▶ 回合 ${data.turn} 开始` }) }
      }
      case 'step/start': {
        return {
          ...state,
          openStep: { turn: data.turn, step: data.step },
          entries: push({ turn: data.turn, step: data.step, summary: `⚙ 步骤 ${data.turn}.${data.step} 开始` }),
        }
      }
      case 'user/message': {
        const content = typeof data.content === 'string' ? data.content : JSON.stringify(data.content ?? '')
        return { ...state, entries: push({ turn: data.turn, summary: `👤 用户：${summarize(content)}` }) }
      }
      case 'tool/call': {
        return {
          ...state,
          pendingCalls: { ...state.pendingCalls, [data.callId]: { name: data.name, turn: data.turn, step: data.step } },
          entries: push({ turn: data.turn, step: data.step, callId: data.callId, summary: `🔧 调用工具 ${data.name}` }),
        }
      }
      case 'tool/result': {
        const call = state.pendingCalls[data.message?.source?.callId]
        const ok = !data.error
        // 兼容两种结构：真实 DSH 的 data.message，以及简化结构 data 直接携带字段
        const files = [...new Set([...extractDeliverables(data.message), ...extractDeliverables(data)])]
        const pendingCalls = { ...state.pendingCalls }
        delete pendingCalls[data.message?.source?.callId]
        const entry = {
          turn: data.turn,
          step: data.step,
          callId: data.message?.source?.callId,
          summary: ok ? `✅ 工具结果${call ? `（${call.name}）` : ''}` : `❌ 工具失败${call ? `（${call.name}）` : ''}`,
          ok,
          files,
        }
        return { ...state, pendingCalls, entries: push(entry) }
      }
      case 'assistant/message': {
        const content = typeof data.message?.content === 'string' ? data.message.content : ''
        const usage = data.usage
        return {
          ...state,
          entries: push({
            turn: data.turn,
            step: data.step,
            summary: `🤖 助手：${summarize(content)}`,
            usage: usage
              ? {
                  inputTokens: usage.inputTokens,
                  outputTokens: usage.outputTokens,
                  reasoningTokens: usage.reasoningTokens,
                }
              : undefined,
          }),
        }
      }
      case 'step/end': {
        return { ...state, openStep: null, entries: push({ turn: data.turn, step: data.step, summary: `✔ 步骤 ${data.turn}.${data.step} 结束` }) }
      }
      case 'turn/end': {
        return { ...state, entries: push({ turn: data.turn, summary: `■ 回合 ${data.turn} 结束（${data.reason ?? 'done'}）` }) }
      }
      default:
        return state
    }
  },
  view: (state) => ({ entries: state.entries }),
  stateVersion: 1,
}
