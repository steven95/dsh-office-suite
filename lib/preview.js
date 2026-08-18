/**
 * dsh-office-suite - 产出物预览
 *
 * 纯函数：判断文件类型、生成预览文本。
 * 文件读取由 index.js 完成（需要 fs）。
 */

const TEXT_EXTS = new Set([
  'md', 'txt', 'json', 'yaml', 'yml', 'html', 'htm', 'js', 'mjs', 'cjs', 'ts', 'tsx', 'jsx',
  'py', 'java', 'go', 'rs', 'c', 'cpp', 'h', 'hpp', 'sh', 'bash', 'zsh', 'css', 'scss', 'less',
  'xml', 'csv', 'toml', 'ini', 'conf', 'log', 'sql', 'vue', 'svelte',
])
const IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico', 'bmp', 'avif'])
const VIDEO_EXTS = new Set(['mp4', 'webm', 'mov', 'avi', 'mkv'])
const AUDIO_EXTS = new Set(['mp3', 'wav', 'flac', 'ogg', 'm4a'])
const ARCHIVE_EXTS = new Set(['zip', 'tar', 'gz', '7z', 'rar', 'tgz', 'bz2'])

/** 文件扩展名。 */
export function extOf(path) {
  const base = String(path).split('?')[0]
  const name = base.split('/').pop() || ''
  const dot = name.lastIndexOf('.')
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : ''
}

/** 文件类型分类。 */
export function previewKind(path) {
  const ext = extOf(path)
  if (TEXT_EXTS.has(ext)) return 'text'
  if (IMAGE_EXTS.has(ext)) return 'image'
  if (VIDEO_EXTS.has(ext)) return 'video'
  if (AUDIO_EXTS.has(ext)) return 'audio'
  if (ARCHIVE_EXTS.has(ext)) return 'archive'
  return 'unknown'
}

/** 类型 → 人类可读描述。 */
export function kindLabel(kind) {
  switch (kind) {
    case 'text': return '文本'
    case 'image': return '图片'
    case 'video': return '视频'
    case 'audio': return '音频'
    case 'archive': return '压缩包'
    default: return '未知'
  }
}

/** 生成文本预览（截断 + 行号）。 */
export function renderTextPreview(content, maxLines = 40, maxChars = 4000) {
  if (typeof content !== 'string') return '(非文本内容)'
  const lines = content.split('\n')
  const shown = lines.slice(0, maxLines)
  const truncated = lines.length > maxLines
  let text = shown.join('\n')
  if (text.length > maxChars) {
    text = text.slice(0, maxChars)
    return `${text}\n… (内容过长，已截断)`
  }
  if (truncated) text += `\n… (共 ${lines.length} 行，仅显示前 ${maxLines} 行)`
  return text
}

/** 生成文件预览结果（不含文件内容读取）。 */
export function buildPreview(path, stat, content) {
  const kind = previewKind(path)
  const base = {
    path,
    kind,
    kindLabel: kindLabel(kind),
    size: stat?.size ?? null,
    modifiedAt: stat?.mtimeMs ?? null,
  }
  if (kind === 'text') {
    return { ...base, preview: renderTextPreview(content) }
  }
  if (kind === 'image') {
    return { ...base, preview: `[图片] ${path.split('/').pop()}（${stat?.size ?? 0} 字节）` }
  }
  return { ...base, preview: `[${kindLabel(kind)}] ${path.split('/').pop()}（${stat?.size ?? 0} 字节）` }
}
