import axios from 'axios'

const shareHttp = axios.create({
  baseURL: (import.meta.env.VITE_API_BASE_URL || '/api') + '/shares',
  headers: { 'Content-Type': 'application/json' },
})

export async function getSharePublication(token: string) {
  const resp = await shareHttp.get(`/${token}`)
  if (resp.data.code !== 200) throw new Error(resp.data.message)
  return resp.data.data
}

export async function getShareMeta(token: string) {
  const resp = await shareHttp.get(`/${token}/meta`)
  if (resp.data.code !== 200) throw new Error(resp.data.message)
  return resp.data.data
}

export function getSharePhotoUrl(token: string, photoId: number): string {
  return `/api/shares/${token}/photos/${photoId}`
}
