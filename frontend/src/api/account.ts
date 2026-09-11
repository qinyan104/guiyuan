import http, { unwrapApiResponse } from './http'
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
  return unwrapApiResponse(http.post<ApiResponse<DerivedAccount[]>>(`/publications/${pubId}/accounts/derive`))
}

export async function listAccounts(pubId: number): Promise<PersonAccountRow[]> {
  return unwrapApiResponse(http.get<ApiResponse<PersonAccountRow[]>>(`/publications/${pubId}/accounts`))
}

export async function disableAccount(pubId: number, personDbId: number): Promise<void> {
  await unwrapApiResponse(http.put<ApiResponse<null>>(`/publications/${pubId}/accounts/${personDbId}/disable`))
}

export async function enableAccount(pubId: number, personDbId: number): Promise<void> {
  await unwrapApiResponse(http.put<ApiResponse<null>>(`/publications/${pubId}/accounts/${personDbId}/enable`))
}

export async function resetAccountPassword(pubId: number, personDbId: number): Promise<string> {
  const result = await unwrapApiResponse(
    http.post<ApiResponse<{ newPassword: string }>>(`/publications/${pubId}/accounts/${personDbId}/reset-password`),
  )
  return result.newPassword
}

export async function deleteAccount(pubId: number, personDbId: number): Promise<void> {
  await unwrapApiResponse(http.delete<ApiResponse<null>>(`/publications/${pubId}/accounts/${personDbId}`))
}

export async function cleanupOrphanedAccounts(pubId: number): Promise<number> {
  const result = await unwrapApiResponse(
    http.delete<ApiResponse<{ cleaned: number }>>(`/publications/${pubId}/accounts/orphans`),
  )
  return result.cleaned
}

export async function batchDeleteAccounts(pubId: number, personDbIds: number[]): Promise<number> {
  const result = await unwrapApiResponse(
    http.post<ApiResponse<{ deleted: number }>>(`/publications/${pubId}/accounts/batch-delete`, {
      personDbIds,
    }),
  )
  return result.deleted
}
