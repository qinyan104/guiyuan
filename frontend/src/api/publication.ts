import http, { unwrapApiResponse } from './http'
import type { ApiResponse } from '../types/api'
import type { PublicationData, PublicationSettings, PublicationInfo } from '../types/family'

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
  lastUpdatedBy?: string
  lastActivityAction?: string
}

export interface PublicationLoadResult {
  id: number
  revision: number
  publication: PublicationData
  settings: PublicationSettings
}

export interface PublicationDownloadProgress {
  loaded: number
  total?: number
}

export async function listPublications(): Promise<PublicationSummary[]> {
  return unwrapApiResponse(http.get<ApiResponse<PublicationSummary[]>>('/publications'))
}

export async function getPublication(
  id: number,
  onDownloadProgress?: (event: PublicationDownloadProgress) => void,
): Promise<PublicationLoadResult> {
  return unwrapApiResponse(
    http.get<ApiResponse<PublicationLoadResult>>(
      `/publications/${id}`,
      onDownloadProgress ? { onDownloadProgress } : undefined,
    ),
  )
}

export async function createPublication(
  publication: PublicationData,
  settings: PublicationSettings,
  title?: string,
): Promise<number> {
  const created = await unwrapApiResponse(
    http.post<ApiResponse<{ id: number }>>('/publications', {
      title: title || publication.title,
      subtitle: publication.subtitle,
      publication,
      settings,
      info: publication.info,
    }),
  )
  return created.id
}

export async function updatePublication(
  id: number,
  publication: PublicationData,
  settings: PublicationSettings,
): Promise<number> {
  const result = await unwrapApiResponse(
    http.put<ApiResponse<{ newRevision: number }>>(`/publications/${id}`, {
      revision: publication.revision,
      title: publication.title,
      subtitle: publication.subtitle,
      publication,
      settings,
      info: publication.info,
    }),
  )
  return result.newRevision
}

export async function updatePublicationMetadata(
  id: number,
  revision: number,
  title: string,
  subtitle: string,
  info: PublicationInfo | null,
): Promise<number> {
  const result = await unwrapApiResponse(
    http.put<ApiResponse<{ newRevision: number }>>(`/publications/${id}/metadata`, {
      revision,
      title,
      subtitle,
      info,
    }),
  )
  return result.newRevision
}

export async function deletePublication(id: number): Promise<void> {
  await unwrapApiResponse(http.delete<ApiResponse<null>>(`/publications/${id}`))
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
  const entries = await unwrapApiResponse(http.get<ApiResponse<ActivityEntry[]>>(`/publications/${id}/history`))
  return (entries || []).map(entry => ({
    ...entry,
    parsedDetail: tryParseDetail(entry.detail),
  }))
}
