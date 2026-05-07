import axios from 'axios'
import { getAccessToken, setAccessToken, clearSession } from './tokenStore'

const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, // send cookies (refresh_token, XSRF-TOKEN)
})

// CSRF auto-configuration
http.defaults.xsrfCookieName = 'XSRF-TOKEN'
http.defaults.xsrfHeaderName = 'X-XSRF-TOKEN'

// Request interceptor: attach access token
http.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor: on 401, try refresh then retry
let refreshPromise: Promise<string> | null = null

http.interceptors.response.use(
  (resp) => resp,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true

      try {
        // Deduplicate concurrent refresh calls
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
