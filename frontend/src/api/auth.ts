import axios from 'axios'

const BASE_URL = 'http://localhost:8080/api/auth'

export interface LoginRequest {
  username: string
  password: string
}

export interface RegisterRequest {
  username: string
  password: string
  nickname?: string
}

export interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

const http = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

// 自动在每个请求头里携带 token
http.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export async function login(req: LoginRequest): Promise<{ token: string; username: string }> {
  const resp = await http.post<ApiResponse<{ token: string; username: string }>>('/login', req)
  if (resp.data.code !== 200) throw new Error(resp.data.message)
  localStorage.setItem('authToken', resp.data.data.token)
  localStorage.setItem('authUsername', resp.data.data.username)
  return resp.data.data
}

export async function register(req: RegisterRequest): Promise<void> {
  const resp = await http.post<ApiResponse<null>>('/register', req)
  if (resp.data.code !== 200) throw new Error(resp.data.message)
}

export function logout() {
  localStorage.removeItem('authToken')
  localStorage.removeItem('authUsername')
}

export function getToken(): string | null {
  return localStorage.getItem('authToken')
}

export function getUsername(): string | null {
  return localStorage.getItem('authUsername')
}
