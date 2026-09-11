import http from './http'
import type { PublicRequestConfig } from './http'
import type { PublicationData, PublicationSettings } from '../types/family'

/**
 * 公开分享接口客户端。
 *
 * 分享页允许匿名访问，因此这里统一走 `http` 实例并携带 `skipAuth`：
 * - 请求拦截器不会注入 Authorization（避免携带本地残留 token）
 * - 响应拦截器不会触发 401 刷新/跳转登录，也不会派发全局冲突事件
 *
 * 复用 `http` 的好处是 baseURL 解析与错误对象形态保持一致，
 * 这样调用方（ShareView）仍可通过 `error.response.status` 区分 404/410。
 */
const publicRequest = { skipAuth: true } as PublicRequestConfig

export interface SharePayload {
  publication: PublicationData
  settings?: Partial<PublicationSettings>
}

export interface ShareMeta {
  title?: string
  subtitle?: string
  expiresAt?: string
  allowExport?: boolean
}

export async function getSharePublication(token: string): Promise<SharePayload> {
  const resp = await http.get(`/shares/${token}`, publicRequest)
  if (resp.data.code !== 200) throw new Error(resp.data.message)
  return resp.data.data
}

export async function getShareMeta(token: string): Promise<ShareMeta> {
  const resp = await http.get(`/shares/${token}/meta`, publicRequest)
  if (resp.data.code !== 200) throw new Error(resp.data.message)
  return resp.data.data
}

export function getSharePhotoUrl(token: string, photoId: number): string {
  return `/api/shares/${token}/photos/${photoId}`
}
