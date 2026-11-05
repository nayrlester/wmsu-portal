import { useMemo } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import type { CopilotPageContext } from '@/features/copilot/types/copilot.types'
import { useDocument } from '@/hooks/use-api'

export function useCopilotPageContext(): CopilotPageContext {
  const location = useLocation()
  const { id: documentId } = useParams<{ id: string }>()
  const isDocumentDetail = Boolean(documentId && location.pathname.includes('/documents/'))
  const { data: document } = useDocument(isDocumentDetail ? documentId : undefined)

  return useMemo(
    () => ({
      pathname: location.pathname,
      documentId: isDocumentDetail ? documentId : undefined,
      documentTitle: document?.title,
      documentStatus: document?.status,
      trackingNumber: document?.trackingNumber,
    }),
    [location.pathname, documentId, isDocumentDetail, document?.title, document?.status, document?.trackingNumber]
  )
}
