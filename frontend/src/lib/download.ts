/**
 * 浏览器端 Blob 下载的公共工具。
 *
 * 备份导出与 GEDCOM 导出都需要「拿到 Blob → 解析文件名 → 触发下载」，
 * 之前两处各写了一份（其中一处还用了 raw fetch 绕过 HTTP 客户端），这里统一。
 */

const FILENAME_PATTERN = /filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i

function readHeader(headers: unknown, name: string): string | undefined {
  if (!headers || typeof headers !== 'object') return undefined
  const value = (headers as Record<string, unknown>)[name]
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value.find(item => typeof item === 'string') as string | undefined
  return undefined
}

/**
 * 从响应头里解析下载文件名，失败时回退到 fallback。
 *
 * 支持 `filename="x.sql"`、`filename=x.sql` 以及 `filename*=UTF-8''%E4%B8%AD.sql`。
 */
export function resolveDownloadFilename(headers: unknown, fallback: string): string {
  const disposition = readHeader(headers, 'content-disposition')
  if (!disposition) return fallback

  const match = FILENAME_PATTERN.exec(disposition)
  const raw = match?.[1]?.trim()
  if (!raw) return fallback

  try {
    return decodeURIComponent(raw)
  } catch {
    return raw
  }
}

/** 在浏览器中触发一次 Blob 下载。 */
export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}
