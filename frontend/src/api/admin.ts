import http, { unwrapApiEnvelope, unwrapApiResponse } from './http'
import type { ApiResponse } from '../types/api'
import { resolveDownloadFilename, triggerBlobDownload } from '../lib/download'

export interface AdminUser {
  id: number
  username: string
  nickname: string
  role: string
  createdAt: string
  avatarUrl?: string
}

export interface AdminUserPage {
  items: AdminUser[]
  page: number
  size: number
  total: number
  totalPages: number
}

export async function adminListUsers(
  page = 0,
  size = 50,
  query = '',
  role = '',
): Promise<AdminUserPage> {
  return unwrapApiResponse(
    http.get<ApiResponse<AdminUserPage>>('/admin/users', { params: { page, size, query, role } }),
  )
}

export async function adminCreateUser(
  username: string,
  password: string,
  nickname?: string,
  role?: string,
): Promise<void> {
  await unwrapApiResponse(http.post<ApiResponse<null>>('/admin/users', { username, password, nickname, role }))
}

export async function adminDeleteUser(id: number): Promise<void> {
  await unwrapApiResponse(http.delete<ApiResponse<null>>(`/admin/users/${id}`))
}

export async function adminResetPassword(id: number, newPassword: string): Promise<void> {
  await unwrapApiResponse(http.put<ApiResponse<null>>(`/admin/users/${id}/password`, { newPassword }))
}

export async function adminChangeRole(id: number, role: string): Promise<void> {
  await unwrapApiResponse(http.put<ApiResponse<null>>(`/admin/users/${id}/role`, { role }))
}

export async function adminBackupDatabase(): Promise<void> {
  return downloadBackup()
}

/**
 * 下载数据库备份。
 *
 * 走统一的 `http` 实例（而不是 raw fetch），这样 401 会触发续期、
 * 错误对象也能被 `classifyError` 分类。响应体是二进制流，不是 ApiResponse，
 * 因此不做 code 解包。
 */
export async function downloadBackup(): Promise<void> {
  const resp = await http.get<Blob>('/admin/backup', { responseType: 'blob' })
  const filename = resolveDownloadFilename(resp.headers, 'genealogy_backup.sql')
  triggerBlobDownload(resp.data, filename)
}

export async function adminRestoreDatabase(file: File): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)
  // 不手动设置 Content-Type：交给 axios/浏览器生成带 boundary 的 multipart 头。
  const { message } = await unwrapApiEnvelope(http.post<ApiResponse<{ filename: string }>>('/admin/restore', formData))
  return message || '数据库已还原'
}

export interface ConsistencyIssue {
  type: string
  personId: string
  personName: string
  detail: string
}

export interface ConsistencyReport {
  totalIssues: number
  issues: ConsistencyIssue[]
}

export async function adminCheckConsistency(): Promise<ConsistencyReport> {
  return unwrapApiResponse(http.get<ApiResponse<ConsistencyReport>>('/admin/check-consistency'))
}

export async function adminBatchDeleteUsers(ids: number[]): Promise<{ deleted: number; requested: number }> {
  return unwrapApiResponse(
    http.post<ApiResponse<{ deleted: number; requested: number }>>('/admin/users/batch-delete', { ids }),
  )
}
