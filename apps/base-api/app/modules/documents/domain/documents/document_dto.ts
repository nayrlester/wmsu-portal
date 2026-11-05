import type {
  DocumentPriority,
  DocumentStatus,
  DocumentVisibility,
  DocumentSourceType,
  DocumentConfidentiality,
  NapCategory,
  RecordsLifecycleStatus,
  DispositionAction,
} from '#modules/documents/domain/enums/index'

export interface CreateDocumentDto {
  title: string
  description?: string
  priority?: DocumentPriority | string
  documentTypeId?: string
  departmentId?: string
  assignedToId?: string
  metadata?: Record<string, unknown>
  contentHtml?: string
  visibility?: DocumentVisibility | string
  sourceType?: DocumentSourceType | string
  originatingOfficeId?: string
  receivingOfficeId?: string
  documentDate?: string
  receivedAt?: string
  subjectKeywords?: string
  confidentiality?: DocumentConfidentiality | string
  napCategory?: NapCategory | string
  retentionScheduleId?: string
  lifecycleStatus?: RecordsLifecycleStatus | string
  dispositionAction?: DispositionAction | string
  filePlanNodeId?: string
  receivingChannel?: string
}

export interface UpdateDocumentDto {
  title?: string
  description?: string | null
  priority?: DocumentPriority | string
  documentTypeId?: string | null
  departmentId?: string | null
  assignedToId?: string | null
  metadata?: Record<string, unknown> | null
  visibility?: DocumentVisibility | string
  originatingOfficeId?: string | null
  receivingOfficeId?: string | null
  documentDate?: string | null
  receivedAt?: string | null
  subjectKeywords?: string | null
  confidentiality?: DocumentConfidentiality | string
  napCategory?: NapCategory | string | null
  retentionScheduleId?: string | null
  lifecycleStatus?: RecordsLifecycleStatus | string
  dispositionAction?: DispositionAction | string | null
  filePlanNodeId?: string | null
  receivingChannel?: string | null
}

export interface DocumentListFilters {
  page?: number
  limit?: number
  cursor?: string
  status?: DocumentStatus | string
  priority?: DocumentPriority | string
  departmentId?: string
  documentTypeId?: string
  search?: string
  /** When set, draft documents are visible only to their creator. */
  viewerUserId?: string
  napCategory?: string
  lifecycleStatus?: string
  confidentiality?: string
  dueForArchive?: boolean
  filePlanNodeId?: string
  originatingOfficeId?: string
  receivingOfficeId?: string
}
