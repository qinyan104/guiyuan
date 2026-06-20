/**
 * 小程序 HTTP 请求封装
 *
 * 自动附加 JWT token，处理 401 自动续期，续期失败才跳登录
 */

// ── BASE_URL 配置 ──
// 开发环境：http://localhost:8080/api
// 生产环境：替换为你的域名
const BASE_URL = 'http://localhost:8080/api'

interface RequestOptions {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  data?: any
  header?: Record<string, string>
  timeout?: number
}

interface ApiResponse<T = any> {
  code: number
  message?: string
  data: T
}

// ── Token 管理 ──

export function getToken(): string | null {
  return uni.getStorageSync('token') || null
}

export function setToken(token: string) {
  uni.setStorageSync('token', token)
}

export function getRefreshToken(): string | null {
  return uni.getStorageSync('refreshToken') || null
}

export function setRefreshToken(token: string) {
  uni.setStorageSync('refreshToken', token)
}

export function clearToken() {
  uni.removeStorageSync('token')
  uni.removeStorageSync('refreshToken')
}

// ── Token 续期 ──

let isRefreshing = false
let refreshQueue: Array<() => void> = []

async function tryRefreshToken(): Promise<boolean> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) return false

  // 防止并发续期
  if (isRefreshing) {
    return new Promise((resolve) => {
      refreshQueue.push(() => resolve(!!getToken()))
    })
  }

  isRefreshing = true
  try {
    const res = await new Promise<ApiResponse<any>>((resolve, reject) => {
      uni.request({
        url: `${BASE_URL}/auth/refresh`,
        method: 'POST',
        header: {
          'Content-Type': 'application/json',
          'Authorization': `Refresh ${refreshToken}`,
        },
        success: (r) => {
          if (r.statusCode >= 200 && r.statusCode < 300) {
            resolve(r.data as ApiResponse<any>)
          } else {
            reject(new Error('refresh failed'))
          }
        },
        fail: () => reject(new Error('refresh failed')),
      })
    })

    if (res.code === 200 && res.data?.token) {
      setToken(res.data.token)
      // 后端可能轮换了 refreshToken
      if (res.data.refreshToken) {
        setRefreshToken(res.data.refreshToken)
      }
      refreshQueue.forEach((cb) => cb())
      refreshQueue = []
      return true
    }
  } catch {
    // 续期失败，清除 token
    clearToken()
  } finally {
    isRefreshing = false
    refreshQueue = []
  }

  return false
}

// ── 核心请求 ──

export async function request<T = any>(options: RequestOptions): Promise<ApiResponse<T>> {
  const token = getToken()
  const header: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.header,
  }
  if (token) {
    header['Authorization'] = `Bearer ${token}`
  }

  const doRequest = (): Promise<ApiResponse<T>> =>
    new Promise((resolve, reject) => {
      uni.request({
        url: `${BASE_URL}${options.url}`,
        method: options.method || 'GET',
        data: options.data,
        header,
        timeout: options.timeout || 30000,
        success: (res) => {
          const statusCode = res.statusCode
          const data = res.data as ApiResponse<T>

          if (statusCode >= 200 && statusCode < 300) {
            resolve(data)
          } else if (statusCode === 401) {
            reject({ status: 401, data })
          } else {
            reject(new Error(data?.message || `请求失败 (${statusCode})`))
          }
        },
        fail: (err) => {
          reject(new Error(err.errMsg || '网络请求失败'))
        },
      })
    })

  try {
    return await doRequest()
  } catch (err: any) {
    // 401 → 尝试续期一次
    if (err?.status === 401) {
      const refreshed = await tryRefreshToken()
      if (refreshed) {
        // 用新 token 重试
        header['Authorization'] = `Bearer ${getToken()}`
        return doRequest()
      }
      // 续期失败，跳登录
      uni.navigateTo({ url: '/pages/profile/profile' })
      throw new Error('登录已过期，请重新登录')
    }
    throw err
  }
}

export const http = {
  get: <T>(url: string, data?: any) => request<T>({ url, method: 'GET', data }),
  post: <T>(url: string, data?: any) => request<T>({ url, method: 'POST', data }),
  put: <T>(url: string, data?: any) => request<T>({ url, method: 'PUT', data }),
  delete: <T>(url: string) => request<T>({ url, method: 'DELETE' }),
}
