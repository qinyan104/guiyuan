import http, { unwrapApiResponse } from './http'
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
  redactionProfile?: string
  createdAt: string
}

export async function searchUsers(query: string, signal?: AbortSignal): Promise<UserSearchResult[]> {
  return unwrapApiResponse(
    http.get<ApiResponse<UserSearchResult[]>>(`/users/search?q=${encodeURIComponent(query)}`, { signal }),
  )
}

export async function listAccessRecords(publicationId: number): Promise<AccessRecord[]> {
  return unwrapApiResponse(http.get<ApiResponse<AccessRecord[]>>(`/publications/${publicationId}/access`))
}

export async function addAccessRecord(
  publicationId: number,
  userId: number,
  role: string,
  redactionProfile?: string,
): Promise<{ id: number }> {
  return unwrapApiResponse(
    http.post<ApiResponse<{ id: number }>>(`/publications/${publicationId}/access`, {
      userId,
      role,
      redactionProfile,
    }),
  )
}

export async function updateAccessRole(
  publicationId: number,
  userId: number,
  role: string,
  redactionProfile?: string,
): Promise<void> {
  await unwrapApiResponse(
    http.put<ApiResponse<null>>(`/publications/${publicationId}/access/${userId}`, { role, redactionProfile }),
  )
}

export async function removeAccessRecord(publicationId: number, userId: number): Promise<void> {
  await unwrapApiResponse(http.delete<ApiResponse<null>>(`/publications/${publicationId}/access/${userId}`))
}

export async function mergeBranch(publicationId: number, personId: string): Promise<void> {
  await unwrapApiResponse(http.post<ApiResponse<null>>(`/publications/${publicationId}/access/${personId}/merge`))
}
