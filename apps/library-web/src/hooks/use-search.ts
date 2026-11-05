import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createSavedSearch,
  deleteSavedSearch,
  fetchRecentSearches,
  fetchSavedSearches,
  runSearch,
} from '@/lib/search-api'
import type { SearchParams } from '@/types/search'

export function useSearch(params: SearchParams, enabled = true) {
  return useQuery({
    queryKey: ['search', params],
    queryFn: () => runSearch(params),
    enabled,
  })
}

export function useRecentSearches() {
  return useQuery({
    queryKey: ['search', 'recent'],
    queryFn: fetchRecentSearches,
  })
}

export function useSavedSearches() {
  return useQuery({
    queryKey: ['search', 'saved'],
    queryFn: fetchSavedSearches,
  })
}

export function useCreateSavedSearch() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createSavedSearch,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['search', 'saved'] }),
  })
}

export function useDeleteSavedSearch() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteSavedSearch,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['search', 'saved'] }),
  })
}
