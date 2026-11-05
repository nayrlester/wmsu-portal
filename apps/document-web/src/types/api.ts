export interface PaginatedMeta {
  total: number
  perPage: number
  currentPage: number
  lastPage: number
  firstPage: number
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: PaginatedMeta
}

export interface DashboardStats {
  totalDocuments: number
  pendingDocuments: number
  approvedDocuments: number
  rejectedDocuments: number
  overdueDocuments: number
  records?: {
    dueForArchival: number
    approachingRetention: number
    byLifecycle: Record<string, number>
    byNapCategory: Record<string, number>
  }
}

export interface DashboardTrendPoint {
  month: string
  count: number
}

export interface DashboardFilesTrendPoint {
  day: string
  count: number
}

export interface DashboardUserAccess {
  totalUsers: number
  activeUsers7d: number
  activeUsers30d: number
  lastAccessedAt: string | null
  uniqueViewers7d: number
  totalViews7d: number
}

export interface UsageTrendMonth {
  month: string
  users: number | null
  documents: number | null
  storage: number | null
}

export interface UsageTrendReport {
  limits: {
    maxUsers: number | null
    maxDocuments: number | null
    maxStorageBytes: number | null
  }
  monthly: UsageTrendMonth[]
}

export interface DocumentRecord {
  id: string
  trackingNumber: string
  trackUrl?: string
  qrCodeUrl?: string | null
  title: string
  description?: string | null
  status: string
  priority: string
  visibility?: 'public' | 'private'
  sourceType?: 'upload' | 'editor' | 'mixed'
  hasContent?: boolean
  contentHtml?: string | null
  department?: { id: string; name: string; code: string } | null
  documentType?: { id: string; name: string; code: string } | null
  createdBy?: { id: string; fullName: string | null; email: string } | null
  lastEditedBy?: {
    id: string
    fullName: string | null
    email: string
    editedAt?: string
  } | null
  assignedTo?: { id: string; fullName: string | null; email: string } | null
  approvedBy?: { id: string; fullName: string | null; email: string; actedAt?: string } | null
  originatingOfficeId?: string | null
  receivingOfficeId?: string | null
  documentDate?: string | null
  receivedAt?: string | null
  subjectKeywords?: string | null
  confidentiality?: string
  legalHold?: boolean
  legalHoldReason?: string | null
  napCategory?: string | null
  retentionScheduleId?: string | null
  lifecycleStatus?: string
  retentionDueAt?: string | null
  dispositionAction?: string | null
  createdAt: string
  updatedAt: string
  submittedAt?: string | null
  files?: Array<{ id: string; fileName: string; originalName: string; mimeType: string; fileSize: number }>
  primaryFile?: { mimeType: string; originalName: string } | null
}

export interface TimelineEntry {
  id: string
  action: string
  remarks?: string | null
  routedAt: string
  fromUser?: { fullName: string | null; email: string } | null
  toUser?: { fullName: string | null; email: string } | null
}

export interface WorkflowRecord {
  id: string
  name: string
  description: string | null
  status: string
  version: number
  definition?: unknown
  publishedAt: string | null
  createdAt: string
  updatedAt: string | null
}

export interface RolePermissionRecord {
  id: string
  slug: string
  name: string
}

export interface RoleRecord {
  id: string
  name: string
  slug: string
  description: string | null
  isSystem: boolean
  permissions?: RolePermissionRecord[]
}

export type PermissionCatalog = Record<string, RolePermissionRecord[]>

export interface AssignableRoleRecord {
  id: string
  name: string
  slug: string
  isSystem: boolean
}

export interface TenantUserRecord {
  id: string
  email: string
  fullName: string | null
  status: string
  emailVerified: boolean
  lastLoginAt: string | null
  createdAt: string
  roles: Array<{ id: string; name: string; slug: string }>
}

export interface Organization {
  id: string
  name: string
  slug: string
  status: string
  planTier: string | null
}

export interface TenantSettings {
  timezone: string
  locale: string
  dateFormat: string
  trackingPrefix: string
}

export interface SubscriptionInfo {
  subscription: {
    id: string
    status: string
    billingCycle: string
    plan: {
      name: string
      slug: string
      maxUsers: number | null
      maxDocuments: number | null
      maxStorageBytes: number | null
    }
  } | null
  plan?: {
    name: string
    slug: string
    maxUsers: number | null
    maxDocuments: number | null
    maxStorageBytes: number | null
  }
}

export interface UsageReport {
  usage: { users: number; documents: number; storageBytes: number }
  limits: { maxUsers: number | null; maxDocuments: number | null; maxStorageBytes: number | null }
  plan: { name: string; slug: string }
}

export interface BillingPlan {
  id: string
  name: string
  slug: string
  description: string | null
  monthlyPrice: number
  annualPrice: number
  currency: string
  maxUsers: number | null
  maxDocuments: number | null
  maxStorageBytes: number | null
  features: Record<string, unknown> | null
}
