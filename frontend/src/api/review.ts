import http from './http'
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
  const resp = await http.get<ApiResponse<ReviewItem[]>>(`/publications/${pubId}/reviews${params}`)
  if (resp.data.code !== 200) throw new Error(resp.data.message || '获取审批列表失败')
  return resp.data.data
}

export async function approveReview(pubId: number, id: number): Promise<void> {
  const resp = await http.post<ApiResponse<null>>(`/publications/${pubId}/reviews/${id}/approve`)
  if (resp.data.code !== 200) throw new Error(resp.data.message || '审批失败')
}

export async function rejectReview(pubId: number, id: number, reason: string): Promise<void> {
  const resp = await http.post<ApiResponse<null>>(`/publications/${pubId}/reviews/${id}/reject`, { reason })
  if (resp.data.code !== 200) throw new Error(resp.data.message || '拒绝失败')
}

export async function batchReview(pubId: number, ids: number[], action: string, reason?: string): Promise<void> {
  const resp = await http.post<ApiResponse<null>>(`/publications/${pubId}/reviews/batch`, { ids, action, reason })
  if (resp.data.code !== 200) throw new Error(resp.data.message || '批量操作失败')
}
