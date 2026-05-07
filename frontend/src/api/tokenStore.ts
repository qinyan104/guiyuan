/** In-memory access token. Survives within a page session, lost on refresh. */
let accessToken: string | null = null
let username: string | null = null
let role: string | null = null

export function getAccessToken(): string | null {
  return accessToken
}

export function setAccessToken(token: string): void {
  accessToken = token
}

export function clearAccessToken(): void {
  accessToken = null
}

export function getUsername(): string | null {
  return username
}

export function setUsername(u: string): void {
  username = u
  try { localStorage.setItem('authUsername', u) } catch {}
}

export function getRole(): string | null {
  return role
}

export function setRole(r: string): void {
  role = r
  try { localStorage.setItem('authRole', r) } catch {}
}

export function clearSession(): void {
  accessToken = null
  username = null
  role = null
  try {
    localStorage.removeItem('authUsername')
    localStorage.removeItem('authRole')
  } catch {}
}
