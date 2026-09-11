import http, { unwrapApiResponse } from '../../api/http'
import type { ApiResponse } from '../../types/api'
import { resolveDownloadFilename, triggerBlobDownload } from '../../lib/download'

export interface GedcomImportResult {
  pubId: number
  personCount: number
  familyCount: number
  warnings: string[]
}

export interface GedcomMergeResult {
  pubId: number
  newPersons: number
  newFamilies: number
  warnings: string[]
}

/**
 * 导入 GEDCOM 文件为新族谱
 */
export async function importGedcom(file: File): Promise<GedcomImportResult> {
  const formData = new FormData()
  formData.append('file', file)

  // 不手动设置 Content-Type：交给 axios/浏览器生成带 boundary 的 multipart 头。
  return unwrapApiResponse(
    http.post<ApiResponse<GedcomImportResult>>('/publications/import', formData, {
      timeout: 120_000, // 大文件可能需要较长时间
    }),
  )
}

/**
 * 合并 GEDCOM 文件到现有族谱
 */
export async function mergeGedcom(pubId: number, file: File): Promise<GedcomMergeResult> {
  const formData = new FormData()
  formData.append('file', file)

  return unwrapApiResponse(
    http.post<ApiResponse<GedcomMergeResult>>(`/publications/${pubId}/gedcom/merge`, formData, {
      timeout: 120_000,
    }),
  )
}

/**
 * 下载 GEDCOM 文件。
 *
 * 走统一的 `http` 实例而不是 raw fetch，这样 401 会触发续期、错误可被分类，
 * 且错误会真正抛给调用方（原实现返回 void 并吞掉异常）。
 */
export async function downloadGedcom(pubId: number): Promise<void> {
  const resp = await http.get<Blob>(`/publications/${pubId}/gedcom`, { responseType: 'blob' })
  const filename = resolveDownloadFilename(resp.headers, `family-${pubId}.ged`)
  triggerBlobDownload(resp.data, filename)
}
