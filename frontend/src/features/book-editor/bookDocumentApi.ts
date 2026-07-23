import http from "../../api/http"
import type { ApiResponse } from "../../types/api"
import type { BookDocument } from "../../types/bookDocument"

interface BookDocumentResponse {
  id: number
  publicationId: number
  title: string
  documentJson: string
  createdAt: string
  updatedAt: string
}

function parseResponse(row: BookDocumentResponse | null): BookDocument | null {
  if (!row) return null
  const parsed = JSON.parse(row.documentJson) as BookDocument
  return {
    ...parsed,
    id: row.id,
    publicationId: row.publicationId,
    title: row.title || parsed.title,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export async function getBookDocument(publicationId: number): Promise<BookDocument | null> {
  const resp = await http.get<ApiResponse<BookDocumentResponse | null>>(`/book-documents/publication/${publicationId}`)
  if (resp.data.code !== 200) throw new Error(resp.data.message || "获取书稿失败")
  return parseResponse(resp.data.data)
}

export async function saveBookDocument(document: BookDocument): Promise<BookDocument> {
  const resp = await http.put<ApiResponse<BookDocumentResponse>>(`/book-documents/publication/${document.publicationId}`, {
    title: document.title,
    documentJson: JSON.stringify(document),
  })
  if (resp.data.code !== 200) throw new Error(resp.data.message || "保存书稿失败")
  const parsed = parseResponse(resp.data.data)
  if (!parsed) throw new Error("保存书稿失败")
  return parsed
}
