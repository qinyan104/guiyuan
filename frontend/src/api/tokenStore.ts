const STORAGE_KEY_TOKEN = 'authToken'
const STORAGE_KEY_USERNAME = 'authUsername'
const STORAGE_KEY_ROLE = 'authRole'

function removeStoredAccessToken(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_TOKEN)
  } catch {
    /* localStorage may be unavailable in private mode */
  }
}

// Access tokens are intentionally memory-only. A refresh-cookie session is
// restored through /auth/refresh during app bootstrap; keeping bearer tokens in
// localStorage makes them available to any injected script.
//
// username / role 会落到 localStorage，但**只是显示提示**，不是授权依据：
// 它们只在「刷新页面后、bootstrap 完成前」这段窗口内被 UI 读取，而且每次
// bootstrap/refresh 都会用服务端返回的 role 覆盖本地值（see applyAuthenticatedSession）。
// 任何权限判定都必须由后端完成——不要新增只依赖 isAdmin() 的客户端保护。
removeStoredAccessToken()

let accessToken: string | null = null
let username: string | null = (() => {
  try {
    return localStorage.getItem(STORAGE_KEY_USERNAME)
  } catch {
    /* localStorage may be unavailable in private mode */ return null
  }
})()
let role: string | null = (() => {
  try {
    return localStorage.getItem(STORAGE_KEY_ROLE)
  } catch {
    /* localStorage may be unavailable in private mode */ return null
  }
})()

export function getAccessToken(): string | null {
  return accessToken
}

export function setAccessToken(token: string): void {
  accessToken = token
  removeStoredAccessToken()
}

export function clearAccessToken(): void {
  accessToken = null
  removeStoredAccessToken()
}

export function getUsername(): string | null {
  return username
}

export function setUsername(u: string): void {
  username = u
  try {
    localStorage.setItem(STORAGE_KEY_USERNAME, u)
  } catch {
    /* localStorage may be unavailable in private mode */
  }
}

export function getRole(): string | null {
  return role
}

export function setRole(r: string): void {
  role = r
  try {
    localStorage.setItem(STORAGE_KEY_ROLE, r)
  } catch {
    /* localStorage may be unavailable in private mode */
  }
}

export function clearSession(): void {
  accessToken = null
  username = null
  role = null
  try {
    localStorage.removeItem(STORAGE_KEY_TOKEN)
    localStorage.removeItem(STORAGE_KEY_USERNAME)
    localStorage.removeItem(STORAGE_KEY_ROLE)
  } catch {
    /* localStorage may be unavailable in private mode */
  }
}
