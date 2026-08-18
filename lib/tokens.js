/**
 * dsh-office-suite - token 统计投影单元
 *
 * 从 assistant/message 的 usage 折叠出 token 用量分项，
 * 并统计回合/步骤/工具调用次数。
 */

/** 投影单元定义。 */
export const officeTokensDefinition = {
  key: 'officeTokens',
  schema: {
    type: 'object',
    additionalProperties: true,
  },
  init: () => ({
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    reasoningTokens: 0,
    turns: 0,
    steps: 0,
    toolCalls: 0,
    lastTurn: null,
  }),
  apply: (state, event) => {
    switch (event.type) {
      case 'assistant/message': {
        const usage = event.data?.usage
        if (!usage) return state
        return {
          ...state,
          inputTokens: state.inputTokens + (usage.inputTokens ?? 0),
          outputTokens: state.outputTokens + (usage.outputTokens ?? 0),
          cacheReadTokens: state.cacheReadTokens + (usage.cacheReadTokens ?? 0),
          cacheWriteTokens: state.cacheWriteTokens + (usage.cacheWriteTokens ?? 0),
          reasoningTokens: state.reasoningTokens + (usage.reasoningTokens ?? 0),
        }
      }
      case 'tool/call': {
        return { ...state, toolCalls: state.toolCalls + 1 }
      }
      case 'step/end': {
        return { ...state, steps: state.steps + 1 }
      }
      case 'turn/end': {
        return {
          ...state,
          turns: state.lastTurn === event.data.turn ? state.turns : state.turns + 1,
          lastTurn: event.data.turn,
        }
      }
      default:
        return state
    }
  },
  view: (state) => ({
    inputTokens: state.inputTokens,
    outputTokens: state.outputTokens,
    cacheReadTokens: state.cacheReadTokens,
    cacheWriteTokens: state.cacheWriteTokens,
    reasoningTokens: state.reasoningTokens,
    totalTokens: state.inputTokens + state.outputTokens + state.cacheReadTokens + state.cacheWriteTokens,
    turns: state.turns,
    steps: state.steps,
    toolCalls: state.toolCalls,
  }),
  stateVersion: 1,
}
