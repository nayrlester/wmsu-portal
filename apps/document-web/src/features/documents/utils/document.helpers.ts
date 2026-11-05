import type { DocumentRecord } from '@/shared/types'
import { APPROVABLE_STATUSES } from '@/features/documents/types/document.types'

export function buildDocumentListFilters(
  search: string,
  status: string,
  page = 1,
  limit = 25,
  extras?: {
    lifecycleStatus?: string
    confidentiality?: string
    napCategory?: string
    dueForArchive?: boolean
  }
) {
  return {
    search: search || undefined,
    status: status || undefined,
    page,
    limit,
    lifecycleStatus: extras?.lifecycleStatus || undefined,
    confidentiality: extras?.confidentiality || undefined,
    napCategory: extras?.napCategory || undefined,
    dueForArchive: extras?.dueForArchive || undefined,
  }
}

export function isApprovableStatus(status: string): boolean {
  return (APPROVABLE_STATUSES as readonly string[]).includes(status)
}

export function getPublicTrackUrl(document: Pick<DocumentRecord, 'trackUrl' | 'trackingNumber'>): string {
  return document.trackUrl ?? `${window.location.origin}/track/${document.trackingNumber}`
}

export function formatTimelineAction(action: string): string {
  return action.replace(/_/g, ' ')
}
