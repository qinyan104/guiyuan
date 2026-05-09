import http from './http'
import type { ApiResponse } from '../types/api'
import { getAccessToken } from './tokenStore'
import { buildAuthHeaders } from './auth'

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
  const resp = await fetch('/api/admin/backup', {
    headers: buildAuthHeaders(),
    credentials: 'include',
  })
  if (!resp.ok) {
    const text = await resp.text()
    throw new Error(text || '备份失败')
  }
  const blob = await resp.blob()
  const disposition = resp.headers.get('Content-Disposition') || ''
  const match = disposition.match(/filename="?([^"]+)"?/)
  const filename = match ? match[1] : 'genealogy_backup.sql'
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export async function downloadBackup(): Promise<void> {
  const token = getAccessToken()
  const baseURL = import.meta.env.VITE_API_BASE_URL || '/api'
  const url = `${baseURL}/admin/backup`

  // Create a temporary anchor to trigger file download
  const a = document.createElement('a')
  a.href = url
  a.download = 'genealogy_backup.sql'
  if (token) {
    // Use fetch to pass auth header, then blob download
    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
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
    a.href = blobUrl
    a.download = filename
    a.click()
    URL.revokeObjectURL(blobUrl)
  } else {
    a.click()
  }
}
