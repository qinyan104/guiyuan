import { http, setToken, clearToken, getToken } from './http'

interface LoginResult {
  token: string
  refreshToken: string
  userId: number
  username: string
}

interface PublicationSummary {
  id: number
  title: string
  subtitle: string
  accessRole: string
  updatedAt: string
}

/**
 * 微信登录
 */
export async function wxLogin(): Promise<LoginResult> {
  return new Promise((resolve, reject) => {
    uni.login({
      provider: 'weixin',
      success: async (loginRes) => {
        if (!loginRes.code) {
          reject(new Error('微信登录失败：未获取到 code'))
          return
        }
        try {
          const resp = await http.post<LoginResult>('/mobile/auth/wechat-login', {
            code: loginRes.code,
          })
          if (resp.code === 200 && resp.data.token) {
            setToken(resp.data.token)
            uni.setStorageSync('refreshToken', resp.data.refreshToken)
            uni.setStorageSync('userId', resp.data.userId)
            uni.setStorageSync('username', resp.data.username)
            resolve(resp.data)
          } else {
            reject(new Error(resp.message || '登录失败'))
          }
        } catch (err) {
          reject(err)
        }
      },
      fail: (err) => {
        reject(new Error('微信登录调用失败: ' + err.errMsg))
      },
    })
  })
}

/**
 * 传统用户名密码登录（备用）
 */
export async function passwordLogin(username: string, password: string): Promise<LoginResult> {
  const resp = await http.post<LoginResult>('/auth/login', { username, password })
  if (resp.code === 200 && resp.data.token) {
    setToken(resp.data.token)
    uni.setStorageSync('refreshToken', resp.data.refreshToken)
    uni.setStorageSync('userId', resp.data.userId)
    uni.setStorageSync('username', resp.data.username)
    return resp.data
  }
  throw new Error(resp.message || '登录失败')
}

/**
 * 获取用户可访问的族谱列表
 */
export async function listPublications(): Promise<PublicationSummary[]> {
  const resp = await http.get<PublicationSummary[]>('/publications')
  if (resp.code === 200) return resp.data
  throw new Error(resp.message || '获取族谱列表失败')
}

/**
 * 获取族谱树数据（需登录）
 */
export async function getPublicationTree(pubId: number) {
  const resp = await http.get(`/publications/${pubId}`)
  if (resp.code === 200) return resp.data
  throw new Error(resp.message || '获取族谱数据失败')
}

/**
 * 通过分享码搜索人物（无需登录）
 */
export async function searchWithShareToken(pubId: number, query: string, shareToken: string) {
  const resp = await http.get(`/mobile/publications/${pubId}/search`, {
    q: query,
    shareToken,
  })
  if (resp.code === 200) return resp.data
  throw new Error(resp.message || '搜索失败')
}

/**
 * 搜索人物（已登录）
 */
export async function searchPersons(pubId: number, query: string) {
  const resp = await http.get(`/mobile/publications/${pubId}/search`, { q: query })
  if (resp.code === 200) return resp.data
  throw new Error(resp.message || '搜索失败')
}

export function isLoggedIn(): boolean {
  return !!getToken()
}

export function logout() {
  clearToken()
  uni.removeStorageSync('userId')
  uni.removeStorageSync('username')
}
