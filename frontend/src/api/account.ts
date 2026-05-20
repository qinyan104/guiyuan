import http from './http'
import type { ApiResponse } from '../types/api'

export interface DerivedAccount {
  personDbId: number
  personName: string
  username: string
  password: string
}

export interface PersonAccountRow {
  personDbId: number
  personName: string
  gender: string
  deceased: boolean
  accountStatus: string | null
  username: string | null
}

export async function deriveAccounts(pubId: number): Promise<DerivedAccount[]> {
  const resp = await http.post<ApiResponse<DerivedAccount[]>>(`/publications/${pubId}/accounts/derive`)
  if (resp.data.code !== 200) throw new Error(resp.data.message || '派生账号失败')
  return resp.data.data
}

export async function listAccounts(pubId: number): Promise<PersonAccountRow[]> {
  const resp = await http.get<ApiResponse<PersonAccountRow[]>>(`/publications/${pubId}/accounts`)
  if (resp.data.code !== 200) throw new Error(resp.data.message || '获取账号列表失败')
  return resp.data.data
}

export async function disableAccount(pubId: number, personDbId: number): Promise<void> {
  const resp = await http.put<ApiResponse<null>>(`/publications/${pubId}/accounts/${personDbId}/disable`)
  if (resp.data.code !== 200) throw new Error(resp.data.message || '停用失败')
}

export async function enableAccount(pubId: number, personDbId: number): Promise<void> {
  const resp = await http.put<ApiResponse<null>>(`/publications/${pubId}/accounts/${personDbId}/enable`)
  if (resp.data.code !== 200) throw new Error(resp.data.message || '启用失败')
}

export async function resetAccountPassword(pubId: number, personDbId: number): Promise<string> {
  const resp = await http.post<ApiResponse<{ newPassword: string }>>(`/publications/${pubId}/accounts/${personDbId}/reset-password`)
  if (resp.data.code !== 200) throw new Error(resp.data.message || '重置密码失败')
  return resp.data.data.newPassword
}

export async function deleteAccount(pubId: number, personDbId: number): Promise<void> {
  const resp = await http.delete<ApiResponse<null>>(`/publications/${pubId}/accounts/${personDbId}`)
  if (resp.data.code !== 200) throw new Error(resp.data.message || '删除账号失败')
}

export async function cleanupOrphanedAccounts(pubId: number): Promise<number> {
  const resp = await http.delete<ApiResponse<{ cleaned: number }>>(`/publications/${pubId}/accounts/orphans`)
  if (resp.data.code !== 200) throw new Error(resp.data.message || '清理空悬账号失败')
  return resp.data.data.cleaned
}

export async function batchDeleteAccounts(pubId: number, personDbIds: number[]): Promise<number> {
  const resp = await http.post<ApiResponse<{ deleted: number }>>(`/publications/${pubId}/accounts/batch-delete`, { personDbIds })
  if (resp.data.code !== 200) throw new Error(resp.data.message || '批量删除失败')
  return resp.data.data.deleted
}
