import { apiClient } from '@/api/client'
import { apiRequest } from '@/api/utils/request'
import type { ImageSearchResult, SearchResultType, UniversalSearchResult } from '@/features/search/types/search.types'

export interface SearchParams {
  q: string
  limit?: number
  types?: SearchResultType[]
}

export const searchApi = {
  search: (params: SearchParams): Promise<UniversalSearchResult> =>
    apiRequest(
      apiClient.get<UniversalSearchResult>('/account/search', {
        params: {
          q: params.q,
          limit: params.limit,
          types: params.types?.join(','),
        },
      })
    ),

  searchByImage: (file: File, limit = 20): Promise<ImageSearchResult> => {
    const form = new FormData()
    form.append('file', file)
    return apiRequest(
      apiClient.post<ImageSearchResult>('/account/search/image', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        params: { limit },
      })
    )
  },
}
