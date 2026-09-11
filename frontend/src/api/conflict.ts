export interface PublicationConflict {
  kind: 'publication-conflict'
  publicationId: number | null
  message: string
}

interface HttpConflictLike {
  response?: { status?: number; data?: { message?: string } }
  config?: { url?: string }
}

function asHttpConflictLike(error: unknown): HttpConflictLike {
  return typeof error === 'object' && error !== null ? (error as HttpConflictLike) : {}
}

export function asPublicationConflict(error: unknown): PublicationConflict | null {
  const httpError = asHttpConflictLike(error)
  const status = httpError.response?.status
  const url = httpError.config?.url ?? ''
  if (status !== 409 || !url.includes('/publications/')) return null

  const match = url.match(/\/publications\/(\d+)/)
  return {
    kind: 'publication-conflict',
    publicationId: match ? Number(match[1]) : null,
    message: httpError.response?.data?.message || 'Publication is stale. Reload before saving.',
  }
}
