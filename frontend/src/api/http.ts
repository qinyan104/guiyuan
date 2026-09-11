import axios, { type AxiosRequestConfig } from 'axios'
import { clearSession, getAccessToken, setAccessToken } from './tokenStore'
import { classifyError, getUserErrorMessage } from './errorClassifier'
import type { ClassifiedError } from './errorClassifier'
import type { ApiResponse } from '../types/api'

const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
})

http.defaults.xsrfCookieName = 'XSRF-TOKEN'
http.defaults.xsrfHeaderName = 'X-XSRF-TOKEN'

http.interceptors.request.use(config => {
  // 公开接口（如分享页）可能由匿名用户访问，绝不能携带本地残留的 token，
  // 否则后端可能因无效凭证拒绝请求，也会把不必要的信息泄露出去。
  if ((config as { skipAuth?: boolean }).skipAuth) {
    delete config.headers.Authorization
    return config
  }
  const token = getAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

/** 供公开接口使用的请求配置：不注入认证信息，也不触发 401 刷新跳转。 */
export interface PublicRequestConfig extends AxiosRequestConfig {
  skipAuth?: true
}

let refreshPromise: Promise<string> | null = null

export function shouldRetryAuthRefresh(config: { url?: string } | AxiosRequestConfig): boolean {
  const url = config.url ?? ''
  return !url.startsWith('/auth/')
}

function getErrorConfigUrl(error: unknown): string {
  if (axios.isAxiosError(error)) return error.config?.url ?? ''
  if (typeof error === 'object' && error !== null && 'config' in error) {
    const config = (error as { config?: { url?: unknown } }).config
    return typeof config?.url === 'string' ? config.url : ''
  }
  return ''
}

// ---- 旧版兼容导出（标记为 deprecated，建议用 classifyError） ----

/** @deprecated 请使用 classifyError(error).userMessage 代替 */
export function formatHttpError(error: unknown): string {
  return getUserErrorMessage(error)
}

/** @deprecated 请使用 classifyError 判断 category === "conflict" 代替 */
export function isPublicationConflict(error: unknown): boolean {
  const classified = classifyError(error)
  const url = getErrorConfigUrl(error)
  return classified.category === 'conflict' && typeof url === 'string' && url.includes('/publications/')
}

// ---- 响应拦截器 ----

http.interceptors.response.use(
  resp => resp,
  async error => {
    const classified = classifyError(error)

    // 公开接口不应产生全局副作用（弹窗/跳转），错误交由调用方展示。
    const original = error.config
    const isPublicRequest = Boolean(original && (original as { skipAuth?: boolean }).skipAuth)

    // 409 非出版物冲突 → 派发全局事件
    if (
      !isPublicRequest &&
      classified.category === 'conflict' &&
      !getErrorConfigUrl(error).includes('/publications/')
    ) {
      window.dispatchEvent(
        new CustomEvent('concurrency-conflict', {
          detail: { message: classified.userMessage },
        }),
      )
    }

    // 401 → token 刷新（公开接口不做刷新，直接交给调用方处理）
    if (!isPublicRequest && classified.category === 'auth' && !original._retry && shouldRetryAuthRefresh(original)) {
      original._retry = true

      try {
        if (!refreshPromise) {
          refreshPromise = http
            .post<{ data: { token: string } }>('/auth/refresh')
            .then(r => {
              setAccessToken(r.data.data.token)
              return r.data.data.token
            })
            .finally(() => {
              refreshPromise = null
            })
        }

        const newToken = await refreshPromise
        original.headers.Authorization = `Bearer ${newToken}`
        return http(original)
      } catch {
        clearSession()
        window.location.href = '/login'
        return Promise.reject(error)
      }
    }

    return Promise.reject(error)
  },
)

// ============================================================
// ApiResponse 安全解包工厂
// 统一处理 resp.data.code !== 200 的模式
// ============================================================

/**
 * 后端返回 `code !== 200` 时抛出的业务错误，携带可分类的错误信息。
 */
export class BusinessError extends Error {
  public readonly classified: ClassifiedError

  constructor(classified: ClassifiedError) {
    super(classified.userMessage)
    this.name = 'BusinessError'
    this.classified = classified
  }
}

/** 是否与当前页面同源（相对路径视为同源）。 */
export function isSameOriginUrl(url: string): boolean {
  try {
    return new URL(url, window.location.origin).origin === window.location.origin
  } catch {
    return false
  }
}

/**
 * 获取二进制资源（人物照片、导出需要内嵌的图片等）。
 *
 * 之前这些地方用的是裸 `fetch`，不会带 Authorization，而 `/api/photos/{id}` 需要
 * `READ_FULL` 权限，结果静默 401（导出丢图、草稿转 Base64 失败）。
 * 改走统一的 `http` 实例后，既会带上凭证/401 续期，错误也能被分类。
 *
 * 跨域地址不注入凭证，避免把 token 泄露给第三方。
 */
export async function fetchBinaryResource(url: string): Promise<Blob> {
  const config: PublicRequestConfig = { baseURL: '', responseType: 'blob' }
  if (!isSameOriginUrl(url)) {
    config.skipAuth = true
  }
  const resp = await http.get<Blob>(url, config)
  return resp.data
}

/**
 * 检查 Axios 响应中的 ApiResponse.code 是否为 200。
 * 若非 200，抛出带分类信息的 BusinessError；否则返回整个信封。
 *
 * 需要同时读取成功文案（如还原成功提示）时用这个，只需要 data 时用 {@link unwrapApiResponse}。
 */
export async function unwrapApiEnvelope<T>(
  promise: Promise<{ data: ApiResponse<T> }>,
): Promise<{ data: T; message?: string }> {
  const resp = await promise
  if (resp.data.code !== 200) {
    const classified: ClassifiedError = {
      category: 'unknown',
      userMessage: resp.data.message || '操作失败',
      retryable: true,
      httpStatus: resp.data.code,
      apiCode: resp.data.code,
      serverMessage: resp.data.message,
    }
    throw new BusinessError(classified)
  }
  return { data: resp.data.data, message: resp.data.message }
}

/**
 * 从 Axios 响应中安全提取 data，自动检查 code !== 200。
 *
 * @example
 *   const users = await unwrapApiResponse(http.get<ApiResponse<AdminUser[]>>("/admin/users"))
 */
export async function unwrapApiResponse<T>(promise: Promise<{ data: ApiResponse<T> }>): Promise<T> {
  return (await unwrapApiEnvelope(promise)).data
}

export { classifyError, getUserErrorMessage }
export type { ClassifiedError }

export default http
