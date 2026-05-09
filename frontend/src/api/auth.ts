import http from './http'
import type { ApiResponse } from '../types/api'
import {
  getAccessToken,
  clearAccessToken,
  getUsername as _getUsername,
  getRole as _getRole,
  clearSession,
} from './tokenStore'
import { applyAuthenticatedSession } from './authSession'

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
  applyAuthenticatedSession(resp.data.data)
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
