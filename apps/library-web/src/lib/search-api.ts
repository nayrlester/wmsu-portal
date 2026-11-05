import { apiClient } from '@/lib/api-client'
import type { ApiResponse } from '@/types/auth'
import type { PaginatedMeta } from '@/types/books'
import type {
  RecentSearch,
  SavedSearch,
  SearchFacets,
  SearchParams,
  SearchResultItem,
} from '@/types/search'

export async function runSearch(params: SearchParams) {
  const { data } = await apiClient.get<
    ApiResponse<SearchResultItem[]> & { facets: SearchFacets; meta: PaginatedMeta & { query: string; preset: string | null } }
  >('/search', { params })
  return {
    results: data.data,
    facets: data.facets,
    meta: data.meta,
  }
}

export async function fetchRecentSearches() {
  const { data } = await apiClient.get<ApiResponse<RecentSearch[]>>('/search/recent')
  return data.data
}

export async function fetchSavedSearches() {
  const { data } = await apiClient.get<ApiResponse<SavedSearch[]>>('/search/saved')
  return data.data
}

export async function createSavedSearch(payload: {
  name: string
  query?: string
  filters?: Record<string, unknown>
}) {
  const { data } = await apiClient.post<ApiResponse<SavedSearch>>('/search/saved', payload)
  return data.data
}

export async function deleteSavedSearch(id: string) {
  await apiClient.delete(`/search/saved/${id}`)
}
