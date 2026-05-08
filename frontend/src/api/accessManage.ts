import http from './http'
import type { ApiResponse } from '../types/api'

export interface UserSearchResult {
  id: number
  username: string
  nickname: string
}

export interface AccessRecord {
  id: number
  userId: number
  username: string
  nickname: string
  role: 'OWNER' | 'EDITOR' | 'VIEWER'
  createdAt: string
}

export async function searchUsers(query: string, signal?: AbortSignal): Promise<UserSearchResult[]> {
  const resp = await http.get<ApiResponse<UserSearchResult[]>>(`/users/search?q=${encodeURIComponent(query)}`, { signal })
  return resp.data.data
}

export async function listAccessRecords(publicationId: number): Promise<AccessRecord[]> {
  const resp = await http.get<ApiResponse<AccessRecord[]>>(`/publications/${publicationId}/access`)
  return resp.data.data
}

export async function addAccessRecord(publicationId: number, userId: number, role: string): Promise<{ id: number }> {
  const resp = await http.post<ApiResponse<{ id: number }>>(`/publications/${publicationId}/access`, { userId, role })
  return resp.data.data
}

export async function updateAccessRole(publicationId: number, userId: number, role: string): Promise<void> {
  await http.put(`/publications/${publicationId}/access/${userId}`, { role })
}

export async function removeAccessRecord(publicationId: number, userId: number): Promise<void> {
  await http.delete(`/publications/${publicationId}/access/${userId}`)
}
