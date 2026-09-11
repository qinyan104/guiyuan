import http, { unwrapApiResponse } from './http'
import type { ApiResponse } from '../types/api'

export async function uploadPhoto(personId: string, publicationId: number, file: File): Promise<number> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('personId', personId)
  formData.append('publicationId', String(publicationId))
  // 不手动设置 Content-Type：交给 axios/浏览器生成带 boundary 的 multipart 头。
  const uploaded = await unwrapApiResponse(http.post<ApiResponse<{ id: number }>>('/photos', formData))
  return uploaded.id
}

export function getPhotoUrl(photoId: number): string {
  return `/api/photos/${photoId}`
}
