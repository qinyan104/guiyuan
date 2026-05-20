import http from './http'
import type { ApiResponse } from '../types/api'

export async function changePassword(oldPassword: string, newPassword: string): Promise<void> {
  const resp = await http.put<ApiResponse<null>>('/user/password', { oldPassword, newPassword })
  if (resp.data.code !== 200) throw new Error(resp.data.message)
}

export async function changeNickname(nickname: string): Promise<void> {
  const resp = await http.put<ApiResponse<null>>('/user/nickname', { nickname })
  if (resp.data.code !== 200) throw new Error(resp.data.message)
}

export async function uploadAvatar(file: File): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)
  const resp = await http.post<ApiResponse<string>>('/user/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  if (resp.data.code !== 200) throw new Error(resp.data.message || '头像上传失败')
  return resp.data.data
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
  const resp = await http.get<ApiResponse<MyProfile>>('/profile/me')
  if (resp.data.code !== 200) throw new Error(resp.data.message || '获取个人信息失败')
  return resp.data.data
}

export async function submitProfileChange(changes: Record<string, unknown>): Promise<void> {
  const resp = await http.put<ApiResponse<null>>('/profile/me', { changes })
  if (resp.data.code !== 200) throw new Error(resp.data.message || '提交修改失败')
}
