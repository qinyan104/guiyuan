import http from './http'

export interface PublicationHit {
  id: number
  title: string
  subtitle: string
}

export interface PersonHit {
  personId: string
  name: string
  publicationId: number
  publicationTitle: string
}

export interface SearchResult {
  publications: PublicationHit[]
  persons: PersonHit[]
}

const emptyResult: SearchResult = {
  publications: [],
  persons: [],
}

export async function searchApi(query: string): Promise<SearchResult> {
  if (!query.trim()) return emptyResult

  try {
    const resp = await http.get<{ code: number; data: SearchResult }>(
      `/search?q=${encodeURIComponent(query)}`,
    )
    return resp.data.data ?? emptyResult
  } catch {
    return emptyResult
  }
}
