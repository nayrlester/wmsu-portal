import { apiClient } from '@/lib/api-client'
import type { ApiResponse } from '@/types/auth'
import type { PaginatedMeta } from '@/types/books'

export interface OpacBook {
  id: string
  title: string
  subtitle?: string | null
  authors?: string | null
  genre?: string | null
  category?: string | null
  isbn13?: string | null
  callNumber?: string | null
  isDigital: boolean
  coverImageUrl?: string | null
  availableCopies: number
  totalCopies: number
  availability: string
  description?: string | null
  citations?: { apa: string; mla: string }
  shelfLocations?: Array<string | null>
}

export async function searchOpac(params: Record<string, unknown> = {}) {
  const { data } = await apiClient.get<ApiResponse<OpacBook[]> & { meta: PaginatedMeta }>(
    '/opac/search',
    { params }
  )
  return { books: data.data, meta: data.meta }
}

export async function fetchOpacBook(id: string) {
  const { data } = await apiClient.get<ApiResponse<OpacBook>>(`/opac/books/${id}`)
  return data.data
}
