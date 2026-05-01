import http from './http'

export async function uploadPhoto(personId: string, publicationId: number, file: File): Promise<number> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('personId', personId)
  formData.append('publicationId', String(publicationId))
  const resp = await http.post<{ code: number; data: { id: number } }>('/photos', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return resp.data.data.id
}

export function getPhotoUrl(photoId: number): string {
  return `http://localhost:8080/api/photos/${photoId}`
}

export async function deletePhoto(photoId: number): Promise<void> {
  await http.delete(`/photos/${photoId}`)
}
