import http, { unwrapApiResponse } from '../../api/http'
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

/**
 * 全量校验
 */
export async function validatePublication(pubId: number): Promise<ValidationFinding[]> {
  return unwrapApiResponse(http.get<ApiResponse<ValidationFinding[]>>(`/publications/${pubId}/validation`))
}

/**
 * 实时校验（单人）
 */
export async function validatePerson(pubId: number, personId: string): Promise<ValidationFinding[]> {
  return unwrapApiResponse(
    http.get<ApiResponse<ValidationFinding[]>>(
      `/publications/${pubId}/validation/person/${encodeURIComponent(personId)}`,
    ),
  )
}
