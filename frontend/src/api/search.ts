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

  // 不吞异常：网络/服务端/权限失败必须冒泡到调用方。
  // 否则「搜索失败」会被渲染成「无搜索结果」，用户无法判断是空结果还是故障。
  const resp = await http.get<{ code: number; data: SearchResult }>(`/search?q=${encodeURIComponent(query)}`)
  return resp.data.data ?? emptyResult
}
