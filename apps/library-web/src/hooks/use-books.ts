import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchBooks,
  fetchBook,
  createBook,
  updateBook,
  deleteBook,
  fetchCategories,
  addBookCopy,
  updateBookCopy,
  deleteBookCopy,
  downloadBookDigitalFile,
  uploadBookDigitalFile,
} from '@/lib/books-api'
import type { BookListParams, CreateBookPayload, UpdateBookPayload, CreateCopyPayload } from '@/types/books'

export const bookKeys = {
  all: ['books'] as const,
  lists: () => [...bookKeys.all, 'list'] as const,
  list: (params: BookListParams) => [...bookKeys.lists(), params] as const,
  details: () => [...bookKeys.all, 'detail'] as const,
  detail: (id: string) => [...bookKeys.details(), id] as const,
  categories: () => [...bookKeys.all, 'categories'] as const,
}

export function useBooks(params: BookListParams) {
  return useQuery({
    queryKey: bookKeys.list(params),
    queryFn: () => fetchBooks(params),
  })
}

export function useBook(id: string) {
  return useQuery({
    queryKey: bookKeys.detail(id),
    queryFn: () => fetchBook(id),
    enabled: !!id,
  })
}

export function useBookCategories() {
  return useQuery({
    queryKey: bookKeys.categories(),
    queryFn: fetchCategories,
  })
}

export function useCreateBook() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateBookPayload) => createBook(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: bookKeys.lists() }),
  })
}

export function useUpdateBook() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateBookPayload }) =>
      updateBook(id, payload),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: bookKeys.lists() })
      qc.invalidateQueries({ queryKey: bookKeys.detail(id) })
    },
  })
}

export function useDeleteBook() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteBook(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: bookKeys.lists() }),
  })
}

export function useAddCopy() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ bookId, payload }: { bookId: string; payload: CreateCopyPayload }) =>
      addBookCopy(bookId, payload),
    onSuccess: (_, { bookId }) => qc.invalidateQueries({ queryKey: bookKeys.detail(bookId) }),
  })
}

export function useUpdateCopy() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      bookId,
      copyId,
      payload,
    }: {
      bookId: string
      copyId: string
      payload: Partial<CreateCopyPayload & { status: string }>
    }) => updateBookCopy(bookId, copyId, payload),
    onSuccess: (_, { bookId }) => qc.invalidateQueries({ queryKey: bookKeys.detail(bookId) }),
  })
}

export function useDeleteCopy() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ bookId, copyId }: { bookId: string; copyId: string }) =>
      deleteBookCopy(bookId, copyId),
    onSuccess: (_, { bookId }) => qc.invalidateQueries({ queryKey: bookKeys.detail(bookId) }),
  })
}

export function useUploadBookDigitalFile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ bookId, file }: { bookId: string; file: File }) =>
      uploadBookDigitalFile(bookId, file),
    onSuccess: (_, { bookId }) => qc.invalidateQueries({ queryKey: bookKeys.detail(bookId) }),
  })
}

export function useDownloadBookDigitalFile() {
  return useMutation({
    mutationFn: ({ bookId, fileId }: { bookId: string; fileId: string }) =>
      downloadBookDigitalFile(bookId, fileId),
  })
}
