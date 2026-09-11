import http, { unwrapApiResponse } from './http'
import type { ApiResponse } from '../types/api'

export interface CreateShareLinkOptions {
  allowExport?: boolean
  expiresInDays?: number
  redactionProfile?: Record<string, unknown>
}

export interface ShareLinkSummary {
  id: number
  status: string
  allowExport: boolean
  expiresAt: string | null
  createdAt: string | null
  revokedAt: string | null
  expired: boolean
}

export interface CreateShareLinkResult {
  token: string
  id: number
  expiresAt: string
}

export async function createShareLink(
  pubId: number,
  options: CreateShareLinkOptions = {},
): Promise<CreateShareLinkResult> {
  return unwrapApiResponse(http.post<ApiResponse<CreateShareLinkResult>>(`/publications/${pubId}/shares`, options))
}

export async function listShareLinks(pubId: number): Promise<ShareLinkSummary[]> {
  return unwrapApiResponse(http.get<ApiResponse<ShareLinkSummary[]>>(`/publications/${pubId}/shares`))
}

export async function revokeShareLink(pubId: number, shareId: number): Promise<void> {
  await unwrapApiResponse(http.delete<ApiResponse<null>>(`/publications/${pubId}/shares/${shareId}`))
}
