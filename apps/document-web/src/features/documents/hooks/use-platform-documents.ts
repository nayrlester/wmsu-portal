import { useQuery } from '@tanstack/react-query'
import {
  platformDocumentsApi,
  type PlatformDocumentPrefix,
} from '@/api/modules/platform-documents.api'

export function usePlatformDocuments(filters: {
  platformPrefix?: PlatformDocumentPrefix
  limit?: number
  offset?: number
}) {
  return useQuery({
    queryKey: ['platform-documents', filters],
    queryFn: () => platformDocumentsApi.list(filters),
  })
}
