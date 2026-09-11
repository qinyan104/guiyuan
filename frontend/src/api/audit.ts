import http, { unwrapApiResponse } from './http'
import type { ApiResponse } from '../types/api'

export interface AuditLogEntry {
  id: number
  username: string
  action: string
  detail: string
  createdAt: string
}

export async function listLogs(page = 0, size = 100): Promise<AuditLogEntry[]> {
  const entries = await unwrapApiResponse(
    http.get<ApiResponse<AuditLogEntry[]>>('/admin/logs', {
      params: { page, size },
    }),
  )
  return entries ?? []
}
