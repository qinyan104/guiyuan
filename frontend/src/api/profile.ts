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
