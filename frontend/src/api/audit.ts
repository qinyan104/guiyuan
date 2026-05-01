import http from './http'

export interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

export interface AuditLogEntry {
  id: number
  username: string
  action: string
  detail: string
  createdAt: string
}

export async function listLogs(): Promise<AuditLogEntry[]> {
  const resp = await http.get<ApiResponse<AuditLogEntry[]>>('/admin/logs')
  return resp.data.data ?? []
}

export async function addLog(action: string, detail?: string): Promise<void> {
  await http.post('/admin/logs', { action, detail })
}
