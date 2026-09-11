import http, { unwrapApiResponse } from './http'
import type { ApiResponse } from '../types/api'
import type { PublicationData, PublicationSettings, PublicationInfo } from '../types/family'
import { formatValidationIssues, validatePublicationData } from '../features/validation/draftSchema'

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

function validatePublicationLoadResult(input: unknown): PublicationLoadResult {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new Error('服务器返回的族谱数据格式无效。')
  }

  const result = input as Partial<PublicationLoadResult>
  const issues = validatePublicationData(result.publication)
  if (issues.length > 0) {
    throw new Error(`服务器返回的族谱数据无效：${formatValidationIssues(issues)}`)
  }

  if (typeof result.settings !== 'object' || result.settings === null || Array.isArray(result.settings)) {
    throw new Error('服务器返回的排版设置格式无效。')
  }

  if (typeof result.id !== 'number' || typeof result.revision !== 'number') {
    throw new Error('服务器返回的族谱版本信息无效。')
  }

  return result as PublicationLoadResult
}

export async function getPublication(
  id: number,
  onDownloadProgress?: (event: PublicationDownloadProgress) => void,
): Promise<PublicationLoadResult> {
  const result = await unwrapApiResponse(
    http.get<ApiResponse<PublicationLoadResult>>(
      `/publications/${id}`,
      onDownloadProgress ? { onDownloadProgress } : undefined,
    ),
  )
  return validatePublicationLoadResult(result)
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
