import http from './http'
import type { ApiResponse } from '../types/api'
import type { PublicationData, PublicationSettings, PublicationInfo, Person } from '../types/family'

export interface PublicationSummary {
  id: number
  revision: number
  title: string
  subtitle: string
  description?: string
  info?: PublicationInfo
  accessRole: string
  createdAt: string
  updatedAt: string
}

export interface PublicationLoadResult {
  id: number
  revision: number
  publication: PublicationData
  settings: PublicationSettings
}

export async function listPublications(): Promise<PublicationSummary[]> {
  const resp = await http.get<ApiResponse<PublicationSummary[]>>('/publications')
  if (resp.data.code !== 200) throw new Error(resp.data.message || '获取族谱列表失败')
  return resp.data.data
}

export async function getPublication(id: number): Promise<PublicationLoadResult> {
  const resp = await http.get<ApiResponse<PublicationLoadResult>>(`/publications/${id}`)
  if (resp.data.code !== 200) throw new Error(resp.data.message || '获取族谱失败')
  return resp.data.data
}

export async function createPublication(
  publication: PublicationData,
  settings: PublicationSettings,
  title?: string,
): Promise<number> {
  const resp = await http.post<ApiResponse<{ id: number }>>('/publications', {
    title: title || publication.title,
    subtitle: publication.subtitle,
    publication,
    settings,
    info: publication.info,
  })
  if (resp.data.code !== 200) throw new Error(resp.data.message || '创建族谱失败')
  return resp.data.data.id
}

export async function updatePublication(
  id: number,
  publication: PublicationData,
  settings: PublicationSettings,
): Promise<number> {
  const resp = await http.put<ApiResponse<{ newRevision: number }>>(`/publications/${id}`, {
    revision: publication.revision,
    title: publication.title,
    subtitle: publication.subtitle,
    publication,
    settings,
    info: publication.info,
  })
  return resp.data.data.newRevision
}

export async function updatePublicationMetadata(
  id: number,
  revision: number,
  title: string,
  subtitle: string,
  info: PublicationInfo | null,
): Promise<number> {
  const resp = await http.put<ApiResponse<{ newRevision: number }>>(`/publications/${id}/metadata`, {
    revision,
    title,
    subtitle,
    info,
  })
  return resp.data.data.newRevision
}

export async function updatePerson(
  pubId: number,
  personId: string,
  personData: Partial<Person> & { expectedRevision?: number },
): Promise<number> {
  const resp = await http.put<ApiResponse<{ newRevision: number }>>(`/publications/${pubId}/people/${personId}`, personData)
  return resp.data.data.newRevision
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

export interface ActivityEntry {
  id: number
  username: string
  action: string
  detail: string
  createdAt: string
}

export interface ParsedActivity extends ActivityEntry {
  parsedDetail: PersonChangeEntry[] | null
}

export interface PersonChangeEntry {
  personName: string
  personId: string
  changes: FieldChange[]
}

export interface FieldChange {
  field: string
  fieldLabel: string
  old: string
  new: string
}

export async function getPublicationHistory(id: number): Promise<PublicationHistoryEntry[]> {
  const resp = await http.get<ApiResponse<PublicationHistoryEntry[]>>(`/publications/${id}/history`)
  return resp.data.data
}

function tryParseDetail(detail: string): PersonChangeEntry[] | null {
  if (!detail || detail === '[]') return null
  try {
    const parsed = JSON.parse(detail)
    if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].personName) {
      return parsed
    }
    return null
  } catch {
    return null
  }
}

export async function getPublicationActivity(id: number): Promise<ParsedActivity[]> {
  const resp = await http.get<ApiResponse<ActivityEntry[]>>(`/publications/${id}/history`)
  if (resp.data.code !== 200) throw new Error(resp.data.message || '获取活动记录失败')
  return (resp.data.data || []).map((entry) => ({
    ...entry,
    parsedDetail: tryParseDetail(entry.detail),
  }))
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
