import http from '../../api/http'
import { getAccessToken } from '../../api/tokenStore'
import type { ApiResponse } from '../../types/api'

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

  const resp = await http.post<ApiResponse<GedcomImportResult>>('/publications/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120_000, // 大文件可能需要较长时间
  })

  if (resp.data.code !== 200) {
    throw new Error(resp.data.message || 'GEDCOM 导入失败')
  }
  return resp.data.data
}

/**
 * 合并 GEDCOM 文件到现有族谱
 */
export async function mergeGedcom(pubId: number, file: File): Promise<GedcomMergeResult> {
  const formData = new FormData()
  formData.append('file', file)

  const resp = await http.post<ApiResponse<GedcomMergeResult>>(
    `/publications/${pubId}/gedcom/merge`,
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120_000,
    }
  )

  if (resp.data.code !== 200) {
    throw new Error(resp.data.message || 'GEDCOM 合并失败')
  }
  return resp.data.data
}

/**
 * 触发浏览器下载 GEDCOM 文件
 */
export function downloadGedcom(pubId: number): void {
  const token = getAccessToken()
  const baseUrl = http.defaults.baseURL || ''
  const url = `${baseUrl}/publications/${pubId}/gedcom`

  // 使用 fetch 下载（需要带 Authorization header）
  fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
    .then((resp) => {
      if (!resp.ok) throw new Error('导出失败')
      return resp.blob()
    })
    .then((blob) => {
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `family-${pubId}.ged`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(a.href)
    })
    .catch((err) => {
      console.error('GEDCOM 导出失败:', err)
      throw err
    })
}
