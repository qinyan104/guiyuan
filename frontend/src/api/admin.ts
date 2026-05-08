import http from './http'
import { getAccessToken } from './tokenStore'

export async function downloadBackup(): Promise<void> {
  const token = getAccessToken()
  const baseURL = import.meta.env.VITE_API_BASE_URL || '/api'
  const url = `${baseURL}/admin/backup`

  // Create a temporary anchor to trigger file download
  const a = document.createElement('a')
  a.href = url
  a.download = 'genealogy_backup.sql'
  if (token) {
    // Use fetch to pass auth header, then blob download
    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      credentials: 'include',
    })
    if (!resp.ok) {
      const detail = resp.status === 403 ? '无权限，仅超级管理员可操作' : `下载失败 (${resp.status})`
      throw new Error(detail)
    }
    const blob = await resp.blob()
    const disposition = resp.headers.get('Content-Disposition') || ''
    const match = disposition.match(/filename="?(.+?)"?$/)
    const filename = match ? match[1] : 'genealogy_backup.sql'
    const blobUrl = URL.createObjectURL(blob)
    a.href = blobUrl
    a.download = filename
    a.click()
    URL.revokeObjectURL(blobUrl)
  } else {
    a.click()
  }
}
