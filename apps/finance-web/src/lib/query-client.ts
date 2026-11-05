import { QueryClient } from '@tanstack/react-query'
import axios from 'axios'

function shouldRetryQuery(failureCount: number, error: unknown) {
  if (axios.isAxiosError(error) && error.response?.status === 429) return false
  return failureCount < 1
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: shouldRetryQuery,
      staleTime: 60_000,
      gcTime: 10 * 60_000,
      refetchOnWindowFocus: false,
    },
  },
})

export function clearQueryCache() {
  queryClient.clear()
}
