/**
 * dsh-office-suite - 产出物投影单元
 *
 * 从 tool/result 事件里提取成功写入的文件路径，去重保序，
 * 记录首次/最近出现时间与出现次数。
 */

import { extractDeliverables } from './log.js'

/** 产出物条数上限。 */
export const MAX_FILES = 200

/** 投影单元定义。 */
export const officeDeliverablesDefinition = {
  key: 'officeDeliverables',
  schema: {
    type: 'object',
    additionalProperties: true,
  },
  init: () => ({ files: [] }),
  apply: (state, event) => {
    if (event.type !== 'tool/result') return state
    if (event.data?.error) return state // 失败的工具调用不算产出
    // 兼容两种结构：真实 DSH 的 data.message，以及简化结构 data 直接携带字段
    const paths = [...new Set([...extractDeliverables(event.data.message), ...extractDeliverables(event.data)])]
    if (paths.length === 0) return state

    let files = [...state.files]
    for (const path of paths) {
      const idx = files.findIndex((f) => f.path === path)
      if (idx >= 0) {
        const prev = files[idx]
        files = [...files.slice(0, idx), { ...prev, lastSeen: event.time, count: prev.count + 1 }, ...files.slice(idx + 1)]
      } else {
        files = [...files, { path, firstSeen: event.time, lastSeen: event.time, count: 1 }]
      }
    }
    if (files.length > MAX_FILES) files = files.slice(files.length - MAX_FILES)
    return { ...state, files }
  },
  view: (state) => ({ files: state.files }),
  stateVersion: 1,
}
