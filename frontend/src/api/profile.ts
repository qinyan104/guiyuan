import http, { unwrapApiResponse } from './http'
import type { ApiResponse } from '../types/api'

export async function changePassword(oldPassword: string, newPassword: string): Promise<void> {
  await unwrapApiResponse(http.put<ApiResponse<null>>('/user/password', { oldPassword, newPassword }))
}

export async function uploadAvatar(file: File): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)
  // 不手动设置 Content-Type：交给 axios/浏览器生成带 boundary 的 multipart 头。
  return unwrapApiResponse(http.post<ApiResponse<string>>('/user/avatar', formData))
}

export interface MyProfilePerson {
  name: string
  gender: string
  birth?: string
  death?: string
  deceased: boolean
  note?: string
  avatarUrl?: string
}

export interface MyProfile {
  person: MyProfilePerson
  publication: { id: number; title: string }
  hasPendingChanges: boolean
  personDbId: number
}

export async function getMyProfile(): Promise<MyProfile> {
  return unwrapApiResponse(http.get<ApiResponse<MyProfile>>('/profile/me'))
}

export async function submitProfileChange(changes: Record<string, unknown>): Promise<void> {
  await unwrapApiResponse(http.put<ApiResponse<null>>('/profile/me', { changes }))
}

export async function updateMyProfileName(name: string): Promise<void> {
  await unwrapApiResponse(http.put<ApiResponse<null>>('/profile/me/name', { name }))
}
