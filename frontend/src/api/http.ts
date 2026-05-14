import axios from 'axios'
import { clearSession, getAccessToken, setAccessToken } from './tokenStore'

const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
})

http.defaults.xsrfCookieName = 'XSRF-TOKEN'
http.defaults.xsrfHeaderName = 'X-XSRF-TOKEN'

http.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

let refreshPromise: Promise<string> | null = null

export function shouldRetryAuthRefresh(config: { url?: string }): boolean {
  const url = config.url ?? ''
  return !url.startsWith('/auth/')
}

export function formatHttpError(error: any): string {
  const apiMessage = error?.response?.data?.message
  if (error?.response?.status === 409 && apiMessage) {
    return apiMessage
  }

  const status = error?.response?.status
  const method = error?.config?.method?.toUpperCase?.() ?? 'REQUEST'
  const url = error?.config?.url ?? 'unknown-url'
  const fallbackMessage = error?.message || 'Unknown error'
  const message = apiMessage || fallbackMessage

  if (status) {
    return `${method} ${url} failed with ${status}: ${message}`
  }

  return `${method} ${url} failed: ${message}`
}

export function isPublicationConflict(error: any): boolean {
  return error?.response?.status === 409
    && typeof error?.config?.url === 'string'
    && error.config.url.includes('/publications/')
}

http.interceptors.response.use(
  (resp) => resp,
  async (error) => {
    if (error.response?.status === 409 && !isPublicationConflict(error)) {
      window.dispatchEvent(
        new CustomEvent('concurrency-conflict', {
          detail: { message: error.response.data?.message || '数据已被他人修改，请刷新页面以获取最新版本。' },
        }),
      )
    }

    const original = error.config
    if (error.response?.status === 401 && !original._retry && shouldRetryAuthRefresh(original)) {
      original._retry = true

      try {
        if (!refreshPromise) {
          refreshPromise = http
            .post<{ data: { token: string } }>('/auth/refresh')
            .then((r) => {
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

export default http
