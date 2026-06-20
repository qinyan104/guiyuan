/**
 * 小程序 HTTP 请求封装
 *
 * 自动附加 JWT token，处理 401 跳转登录
 */

const BASE_URL = 'https://your-domain.com/api' // 生产环境
// 开发环境在 manifest.json h5.devServer.proxy 中配置

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

export function getToken(): string | null {
  return uni.getStorageSync('token') || null
}

export function setToken(token: string) {
  uni.setStorageSync('token', token)
}

export function clearToken() {
  uni.removeStorageSync('token')
  uni.removeStorageSync('refreshToken')
}

export async function request<T = any>(options: RequestOptions): Promise<ApiResponse<T>> {
  const token = getToken()
  const header: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.header,
  }
  if (token) {
    header['Authorization'] = `Bearer ${token}`
  }

  return new Promise((resolve, reject) => {
    uni.request({
      url: `${BASE_URL}${options.url}`,
      method: options.method || 'GET',
      data: options.data,
      header,
      timeout: options.timeout || 30000,
      success: (res) => {
        const statusCode = res.statusCode
        const data = res.data as ApiResponse<T>

        if (statusCode === 401) {
          clearToken()
          uni.navigateTo({ url: '/pages/profile/profile' })
          reject(new Error('登录已过期，请重新登录'))
          return
        }

        if (statusCode >= 200 && statusCode < 300) {
          resolve(data)
        } else {
          reject(new Error(data?.message || `请求失败 (${statusCode})`))
        }
      },
      fail: (err) => {
        reject(new Error(err.errMsg || '网络请求失败'))
      },
    })
  })
}

export const http = {
  get: <T>(url: string, data?: any) => request<T>({ url, method: 'GET', data }),
  post: <T>(url: string, data?: any) => request<T>({ url, method: 'POST', data }),
  put: <T>(url: string, data?: any) => request<T>({ url, method: 'PUT', data }),
  delete: <T>(url: string) => request<T>({ url, method: 'DELETE' }),
}
