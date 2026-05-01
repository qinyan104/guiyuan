import http from './http'
import type { PublicationData, PublicationSettings } from '../types/family'

export interface ApiResponse<T> {
  code: number
  data: T
}

export interface PublicationSummary {
  id: number
  title: string
  subtitle: string
  description?: string
  createdAt: string
  updatedAt: string
}

export interface PublicationLoadResult {
  id: number
  publication: PublicationData
  settings: PublicationSettings
}

export async function listPublications(): Promise<PublicationSummary[]> {
  const resp = await http.get<ApiResponse<PublicationSummary[]>>('/publications')
  return resp.data.data
}

export async function getPublication(id: number): Promise<PublicationLoadResult> {
  const resp = await http.get<ApiResponse<PublicationLoadResult>>(`/publications/${id}`)
  return resp.data.data
}

export async function createPublication(
  publication: PublicationData,
  settings: PublicationSettings,
  title?: string,
): Promise<number> {
  const resp = await http.post<ApiResponse<{ id: number }>>('/publications', {
    title: title || publication.title || '未命名族谱',
    subtitle: publication.subtitle || '',
    publication,
    settings,
    info: publication.info ?? null,
  })
  return resp.data.data.id
}

export async function updatePublication(
  id: number,
  publication: PublicationData,
  settings: PublicationSettings,
): Promise<void> {
  await http.put(`/publications/${id}`, {
    title: publication.title,
    subtitle: publication.subtitle,
    publication,
    settings,
    info: publication.info ?? null,
  })
}

export async function deletePublication(id: number): Promise<void> {
  await http.delete(`/publications/${id}`)
}

export interface PublicationHistoryEntry {
  id: number
  username: string
  action: string
  detail: string
  createdAt: string
}

export async function getPublicationHistory(id: number): Promise<PublicationHistoryEntry[]> {
  const resp = await http.get<ApiResponse<PublicationHistoryEntry[]>>(`/publications/${id}/history`)
  return resp.data.data
}

export async function loadLatestPublication(): Promise<PublicationLoadResult | null> {
  try {
    const list = await listPublications()
    if (list.length === 0) return null
    return await getPublication(list[0].id)
  } catch {
    return null
  }
}
