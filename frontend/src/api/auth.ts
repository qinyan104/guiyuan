import http from './http'

export interface LoginRequest {
  username: string
  password: string
}

export interface RegisterRequest {
  username: string
  password: string
  nickname?: string
}

export interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

export async function login(req: LoginRequest): Promise<{ token: string; username: string; role?: string }> {
  const resp = await http.post<ApiResponse<{ token: string; username: string; role?: string }>>('/auth/login', req)
  if (resp.data.code !== 200) throw new Error(resp.data.message)
  localStorage.setItem('authToken', resp.data.data.token)
  localStorage.setItem('authUsername', resp.data.data.username)
  if (resp.data.data.role) localStorage.setItem('authRole', resp.data.data.role)
  return resp.data.data
}

export async function register(req: RegisterRequest): Promise<void> {
  const resp = await http.post<ApiResponse<null>>('/auth/register', req)
  if (resp.data.code !== 200) throw new Error(resp.data.message)
}

export async function logout() {
  const token = getToken()
  if (token) {
    try {
      await http.post('/auth/logout')
    } catch {
      // ignore server errors on logout
    }
  }
  localStorage.removeItem('authToken')
  localStorage.removeItem('authUsername')
  localStorage.removeItem('authRole')
}

export function getToken(): string | null {
  return localStorage.getItem('authToken')
}

export function buildAuthHeaders(headers: Record<string, string> = {}): Record<string, string> {
  const token = getToken()
  if (!token) {
    return headers
  }

  return {
    ...headers,
    Authorization: `Bearer ${token}`,
  }
}

export function getUsername(): string | null {
  return localStorage.getItem('authUsername')
}

export function getRole(): string | null {
  return localStorage.getItem('authRole')
}

export function isAdmin(): boolean {
  const role = getRole()
  return role === 'ADMIN' || role === 'SUPER_ADMIN'
}

export function isSuperAdmin(): boolean {
  return getRole() === 'SUPER_ADMIN'
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
