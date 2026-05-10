export interface PublicationConflict {
  kind: 'publication-conflict'
  publicationId: number | null
  message: string
}

export function asPublicationConflict(error: any): PublicationConflict | null {
  const status = error?.response?.status
  const url = error?.config?.url ?? ''
  if (status !== 409 || !url.includes('/publications/')) return null

  const match = url.match(/\/publications\/(\d+)/)
  return {
    kind: 'publication-conflict',
    publicationId: match ? Number(match[1]) : null,
    message: error?.response?.data?.message || 'Publication is stale. Reload before saving.',
  }
}
