const STORAGE_KEY_TOKEN = 'authToken'
const STORAGE_KEY_USERNAME = 'authUsername'
const STORAGE_KEY_ROLE = 'authRole'

/** Restore from localStorage on module load (survives page refresh). */
let accessToken: string | null = (() => {
  try { return localStorage.getItem(STORAGE_KEY_TOKEN) } catch { /* localStorage may be unavailable in private mode */ return null }
})()
let username: string | null = (() => {
  try { return localStorage.getItem(STORAGE_KEY_USERNAME) } catch { /* localStorage may be unavailable in private mode */ return null }
})()
let role: string | null = (() => {
  try { return localStorage.getItem(STORAGE_KEY_ROLE) } catch { /* localStorage may be unavailable in private mode */ return null }
})()

export function getAccessToken(): string | null {
  return accessToken
}

export function setAccessToken(token: string): void {
  accessToken = token
  try { localStorage.setItem(STORAGE_KEY_TOKEN, token) } catch { /* localStorage may be unavailable in private mode */ }
}

export function clearAccessToken(): void {
  accessToken = null
  try { localStorage.removeItem(STORAGE_KEY_TOKEN) } catch { /* localStorage may be unavailable in private mode */ }
}

export function getUsername(): string | null {
  return username
}

export function setUsername(u: string): void {
  username = u
  try { localStorage.setItem(STORAGE_KEY_USERNAME, u) } catch { /* localStorage may be unavailable in private mode */ }
}

export function getRole(): string | null {
  return role
}

export function setRole(r: string): void {
  role = r
  try { localStorage.setItem(STORAGE_KEY_ROLE, r) } catch { /* localStorage may be unavailable in private mode */ }
}

export function clearSession(): void {
  accessToken = null
  username = null
  role = null
  try {
    localStorage.removeItem(STORAGE_KEY_TOKEN)
    localStorage.removeItem(STORAGE_KEY_USERNAME)
    localStorage.removeItem(STORAGE_KEY_ROLE)
  } catch { /* localStorage may be unavailable in private mode */ }
}
