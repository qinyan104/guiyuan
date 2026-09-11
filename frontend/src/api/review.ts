import http, { unwrapApiResponse } from './http'
import type { ApiResponse } from '../types/api'

export interface ReviewItem {
  id: number
  personDbId: number
  personName: string
  fieldName: string
  oldValue: string | null
  newValue: string | null
  status: string
  submittedBy: number
  submitterName: string
  reviewedBy: number | null
  rejectReason: string | null
  createdAt: string
  reviewedAt: string | null
}

export async function listReviews(pubId: number, status?: string): Promise<ReviewItem[]> {
  const params = status ? `?status=${status}` : ''
  return unwrapApiResponse(http.get<ApiResponse<ReviewItem[]>>(`/publications/${pubId}/reviews${params}`))
}

export async function approveReview(pubId: number, id: number): Promise<void> {
  await unwrapApiResponse(http.post<ApiResponse<null>>(`/publications/${pubId}/reviews/${id}/approve`))
}

export async function rejectReview(pubId: number, id: number, reason: string): Promise<void> {
  await unwrapApiResponse(http.post<ApiResponse<null>>(`/publications/${pubId}/reviews/${id}/reject`, { reason }))
}

export async function batchReview(pubId: number, ids: number[], action: string, reason?: string): Promise<void> {
  await unwrapApiResponse(http.post<ApiResponse<null>>(`/publications/${pubId}/reviews/batch`, { ids, action, reason }))
}
