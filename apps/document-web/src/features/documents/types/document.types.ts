export interface DepartmentRecord {
  id: string
  name: string
  code: string | null
}

export interface DocumentTypeRecord {
  id: string
  name: string
  code: string
}

export interface CatalogDepartmentRecord extends DepartmentRecord {
  description?: string | null
  isActive: boolean
  createdAt?: string | null
  updatedAt?: string | null
}

export interface CatalogDocumentTypeRecord extends DocumentTypeRecord {
  description?: string | null
  isActive: boolean
  createdAt?: string | null
  updatedAt?: string | null
}

export interface ActivityRecord {
  id: string
  type?: string
  action: string
  remarks?: string | null
  occurredAt?: string
  createdAt?: string
  fromUser?: { fullName: string | null; email: string } | null
  user?: { fullName: string | null; email: string } | null
  actor?: { fullName: string | null; email: string } | null
  metadata?: Record<string, unknown> | null
}

export interface FileRecord {
  id: string
  fileName?: string
  originalName: string
  mimeType: string
  fileSize: number
  versionId?: string | null
  versionNumber?: number
  virusScanned?: boolean
  virusClean?: boolean | null
  extractedMetadata?: Record<string, unknown> | null
  createdAt?: string
}

export interface FileEditSheet {
  name: string
  csv: string
}

export interface FileEditPayload {
  fileId: string
  originalName: string
  mimeType: string
  outputFileName: string
  outputMimeType: string
  preservesOriginalFile?: boolean
  mode: 'text' | 'spreadsheet' | 'extracted_text'
  content?: string
  sheets?: FileEditSheet[]
}

export interface VersionRecord {
  id: string
  versionNumber: number
  versionMinor?: number
  label: string
  status: string
  changeNotes: string | null
  submittedAt?: string | null
  contentHtml?: string | null
  sourceType?: string
  createdAt: string
  createdBy: { id: string; fullName: string | null } | null
  files: FileRecord[]
}

export interface DocumentFilters {
  search?: string
  status?: string
  limit?: number
  page?: number
  lifecycleStatus?: string
  confidentiality?: string
  napCategory?: string
  dueForArchive?: boolean
}

export interface CreateDocumentInput {
  title: string
  description?: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  departmentId?: string
  documentTypeId: string
  visibility?: 'public' | 'private'
  contentHtml?: string
  confidentiality?: string
  originatingOfficeId: string
  receivingOfficeId: string
  documentDate: string
  subjectKeywords: string
  napCategory: string
  retentionScheduleId?: string
  receivingChannel?: string
  filePlanNodeId?: string
}

export interface UpdateDocumentInput {
  title?: string
  description?: string | null
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  visibility?: 'public' | 'private'
}

export interface DocumentApprovalInput {
  action: string
  comments?: string
  stepNodeId?: string
  versionId?: string
}

export interface DocumentWorkflowState {
  active: boolean
  canCurrentUserAct?: boolean
  instance: {
    id: string
    workflowId: string
    versionId?: string | null
    status: string
    currentNodeId: string | null
    activeNodeIds: string[]
    completedNodeIds: string[]
    steps: Array<{
      nodeId: string
      name: string
      type: string
      assignee: { roleId?: string; userId?: string; departmentId?: string } | null
    }>
  } | null
  versionWorkflows?: Array<{
    versionId: string | null
    canCurrentUserAct: boolean
    instance: NonNullable<DocumentWorkflowState['instance']>
  }>
}

export const DOCUMENT_STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'pending_approval', label: 'Pending approval' },
  { value: 'returned', label: 'Returned' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'completed', label: 'Completed' },
  { value: 'archived', label: 'Archived' },
] as const

export const DOCUMENT_LIFECYCLE_OPTIONS = [
  { value: '', label: 'All lifecycle' },
  { value: 'active', label: 'Active' },
  { value: 'semi_active', label: 'Semi-active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'archived', label: 'Archived' },
] as const

export const DOCUMENT_CONFIDENTIALITY_OPTIONS = [
  { value: '', label: 'All confidentiality' },
  { value: 'public', label: 'Public' },
  { value: 'internal', label: 'Internal' },
  { value: 'confidential', label: 'Confidential' },
  { value: 'restricted', label: 'Restricted' },
] as const

export const DOCUMENT_NAP_OPTIONS = [
  { value: '', label: 'All NAP categories' },
  { value: 'administrative', label: 'Administrative' },
  { value: 'financial_property', label: 'Financial / property' },
  { value: 'legal_contractual', label: 'Legal / contractual' },
  { value: 'academic_instructional', label: 'Academic' },
  { value: 'personnel', label: 'Personnel' },
  { value: 'student_support', label: 'Student / support' },
  { value: 'institutional_governance', label: 'Governance' },
] as const

export const DOCUMENT_PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Normal' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
] as const

export const APPROVABLE_STATUSES = ['pending_approval', 'pending_review', 'submitted'] as const
