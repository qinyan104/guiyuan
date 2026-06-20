import http from '../../api/http'
import type { ApiResponse } from '../../types/api'

export type Severity = 'ERROR' | 'WARNING' | 'INFO'

export interface ValidationFinding {
  severity: Severity
  ruleId: string
  personId: string | null
  familyId: string | null
  message: string
  suggestion: string | null
}

export interface ValidationSummary {
  errors: number
  warnings: number
  infos: number
  total: number
}

/**
 * 全量校验
 */
export async function validatePublication(pubId: number): Promise<ValidationFinding[]> {
  const resp = await http.get<ApiResponse<ValidationFinding[]>>(
    `/publications/${pubId}/validation`
  )
  if (resp.data.code !== 200) throw new Error(resp.data.message || '校验失败')
  return resp.data.data
}

/**
 * 校验摘要
 */
export async function getValidationSummary(pubId: number): Promise<ValidationSummary> {
  const resp = await http.get<ApiResponse<ValidationSummary>>(
    `/publications/${pubId}/validation/summary`
  )
  if (resp.data.code !== 200) throw new Error(resp.data.message || '获取校验摘要失败')
  return resp.data.data
}

/**
 * 实时校验（单人）
 */
export async function validatePerson(
  pubId: number,
  personId: string
): Promise<ValidationFinding[]> {
  const resp = await http.get<ApiResponse<ValidationFinding[]>>(
    `/publications/${pubId}/validation/person/${encodeURIComponent(personId)}`
  )
  if (resp.data.code !== 200) throw new Error(resp.data.message || '校验失败')
  return resp.data.data
}
