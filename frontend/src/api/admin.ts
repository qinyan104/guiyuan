import http from './http'
import type { ApiResponse } from '../types/api'
import { getAccessToken } from './tokenStore'

export interface AdminUser {
  id: number
  username: string
  nickname: string
  role: string
  createdAt: string
}

export async function adminListUsers(): Promise<AdminUser[]> {
  const resp = await http.get<ApiResponse<AdminUser[]>>('/admin/users')
  if (resp.data.code !== 200) throw new Error(resp.data.message)
  return resp.data.data
}

export async function adminCreateUser(username: string, password: string, nickname?: string, role?: string): Promise<void> {
  const resp = await http.post<ApiResponse<null>>('/admin/users', { username, password, nickname, role })
  if (resp.data.code !== 200) throw new Error(resp.data.message)
}

export async function adminDeleteUser(id: number): Promise<void> {
  const resp = await http.delete<ApiResponse<null>>(`/admin/users/${id}`)
  if (resp.data.code !== 200) throw new Error(resp.data.message)
}

export async function adminResetPassword(id: number, newPassword: string): Promise<void> {
  const resp = await http.put<ApiResponse<null>>(`/admin/users/${id}/password`, { newPassword })
  if (resp.data.code !== 200) throw new Error(resp.data.message)
}

export async function adminChangeRole(id: number, role: string): Promise<void> {
  const resp = await http.put<ApiResponse<null>>(`/admin/users/${id}/role`, { role })
  if (resp.data.code !== 200) throw new Error(resp.data.message)
}

export async function adminBackupDatabase(): Promise<void> {
  return downloadBackup()
}

export async function downloadBackup(): Promise<void> {
  const token = getAccessToken()
  const baseURL = import.meta.env.VITE_API_BASE_URL || '/api'
  const url = `${baseURL}/admin/backup`

  const resp = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: 'include',
  })
  if (!resp.ok) {
    const detail = resp.status === 403 ? '无权限，仅超级管理员可操作' : `下载失败 (${resp.status})`
    throw new Error(detail)
  }
  const blob = await resp.blob()
  const disposition = resp.headers.get('Content-Disposition') || ''
  const match = disposition.match(/filename="?(.+?)"?$/)
  const filename = match ? match[1] : 'genealogy_backup.sql'
  const blobUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = blobUrl
  a.download = filename
  a.click()
  URL.revokeObjectURL(blobUrl)
}

export async function adminRestoreDatabase(file: File): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)
  const resp = await http.post<ApiResponse<{ filename: string }>>('/admin/restore', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  if (resp.data.code !== 200) throw new Error(resp.data.message || '数据库还原失败')
  return resp.data.message || '数据库已还原'
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
  const resp = await http.get<ApiResponse<ConsistencyReport>>('/admin/check-consistency')
  if (resp.data.code !== 200) throw new Error(resp.data.message || '一致性检查失败')
  return resp.data.data
}

export async function adminBatchDeleteUsers(ids: number[]): Promise<{ deleted: number; requested: number }> {
  const resp = await http.post<ApiResponse<{ deleted: number; requested: number }>>('/admin/users/batch-delete', { ids })
  if (resp.data.code !== 200) throw new Error(resp.data.message || '批量删除失败')
  return resp.data.data
}
