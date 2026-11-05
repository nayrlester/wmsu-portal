import { apiClient } from '@/lib/api-client'
import type { ApiResponse } from '@/types/auth'
import type {
  Book,
  BookCategory,
  BookCopy,
  BookListParams,
  CreateBookPayload,
  CreateCopyPayload,
  PaginatedMeta,
  UpdateBookPayload,
} from '@/types/books'

export async function fetchBooks(params: BookListParams = {}) {
  const { data } = await apiClient.get<ApiResponse<Book[]> & { meta: PaginatedMeta }>('/books', {
    params,
  })
  return { books: data.data, meta: data.meta }
}

export async function fetchBook(id: string) {
  const { data } = await apiClient.get<ApiResponse<Book>>(`/books/${id}`)
  return data.data
}

export async function createBook(payload: CreateBookPayload) {
  const { data } = await apiClient.post<ApiResponse<Book>>('/books', payload)
  return data.data
}

export async function updateBook(id: string, payload: UpdateBookPayload) {
  const { data } = await apiClient.patch<ApiResponse<Book>>(`/books/${id}`, payload)
  return data.data
}

export async function deleteBook(id: string) {
  await apiClient.delete(`/books/${id}`)
}

export async function batchDeleteBooks(ids: string[]) {
  const { data } = await apiClient.post<
    ApiResponse<Array<{ id: string; ok: boolean; error?: string }>>
  >('/books/batch/delete', { ids })
  return data.data
}

export async function exportBookMarc(id: string) {
  const { data } = await apiClient.get<ApiResponse<Record<string, unknown>>>(
    `/books/${id}/export/marc`
  )
  return data.data
}

export async function fetchCategories() {
  const { data } = await apiClient.get<ApiResponse<BookCategory[]>>('/books/categories')
  return data.data
}

export async function addBookCopy(bookId: string, payload: CreateCopyPayload) {
  const { data } = await apiClient.post<ApiResponse<BookCopy>>(`/books/${bookId}/copies`, payload)
  return data.data
}

export async function updateBookCopy(
  bookId: string,
  copyId: string,
  payload: Partial<CreateCopyPayload & { status: string }>
) {
  const { data } = await apiClient.patch<ApiResponse<BookCopy>>(
    `/books/${bookId}/copies/${copyId}`,
    payload
  )
  return data.data
}

export async function deleteBookCopy(bookId: string, copyId: string) {
  await apiClient.delete(`/books/${bookId}/copies/${copyId}`)
}

export async function uploadBookDigitalFile(bookId: string, file: File) {
  const form = new FormData()
  form.append('file', file)
  const { data } = await apiClient.post<ApiResponse<import('@/types/books').BookDigitalFile>>(
    `/books/${bookId}/digital-files`,
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  )
  return data.data
}

export async function downloadBookDigitalFile(bookId: string, fileId: string) {
  const { data } = await apiClient.get<
    ApiResponse<{ url: string; expiresIn?: number; originalName?: string; contentType?: string | null }>
  >(`/books/${bookId}/digital-files/${fileId}/download`)
  return data.data
}
