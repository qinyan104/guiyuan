import http from './http'

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
  const resp = await http.post(`/publications/${pubId}/shares`, options)
  if (resp.data.code !== 200) throw new Error(resp.data.message)
  return resp.data.data
}

export async function listShareLinks(pubId: number): Promise<ShareLinkSummary[]> {
  const resp = await http.get(`/publications/${pubId}/shares`)
  if (resp.data.code !== 200) throw new Error(resp.data.message)
  return resp.data.data
}

export async function revokeShareLink(pubId: number, shareId: number): Promise<void> {
  const resp = await http.delete(`/publications/${pubId}/shares/${shareId}`)
  if (resp.data.code !== 200) throw new Error(resp.data.message)
}
