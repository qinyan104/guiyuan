import http from './http'
import type { ApiResponse } from '../types/api'
import {
  getAccessToken,
  setAccessToken,
  clearAccessToken,
  getUsername as _getUsername,
  setUsername as _setUsername,
  getRole as _getRole,
  setRole as _setRole,
  clearSession,
} from './tokenStore'

export interface LoginRequest {
  username: string
  password: string
}

export interface RegisterRequest {
  username: string
  password: string
  nickname?: string
}

export async function login(req: LoginRequest): Promise<{ token: string; username: string; role?: string }> {
  const resp = await http.post<ApiResponse<{ token: string; username: string; role?: string }>>('/auth/login', req)
  if (resp.data.code !== 200) throw new Error(resp.data.message)
  const { token, username, role } = resp.data.data
  setAccessToken(token)
  _setUsername(username)
  if (role) _setRole(role)
  return resp.data.data
}

export async function register(req: RegisterRequest): Promise<void> {
  const resp = await http.post<ApiResponse<null>>('/auth/register', req)
  if (resp.data.code !== 200) throw new Error(resp.data.message)
}

export async function logout() {
  try {
    await http.post('/auth/logout')
  } catch {
    // ignore server errors on logout
  }
  clearSession()
  clearAccessToken()
}

export function getToken(): string | null {
  return getAccessToken()
}

export function buildAuthHeaders(headers: Record<string, string> = {}): Record<string, string> {
  const token = getAccessToken()
  if (!token) return headers
  return { ...headers, Authorization: `Bearer ${token}` }
}

export function getUsername(): string | null {
  return _getUsername()
}

export function getRole(): string | null {
  return _getRole()
}

export function isAdmin(): boolean {
  const role = _getRole()
  return role === 'ADMIN' || role === 'SUPER_ADMIN'
}

export function isSuperAdmin(): boolean {
  return _getRole() === 'SUPER_ADMIN'
}

// ─── Admin API ────────────────────────────────────────────────

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
