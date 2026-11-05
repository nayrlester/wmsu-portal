export type AppEnvironment = 'development' | 'staging' | 'production'

function resolveApiUrl(): string {
  return (
    import.meta.env.VITE_API_BASE_URL ??
    import.meta.env.VITE_API_URL ??
    ''
  )
}

function resolveAppEnv(): AppEnvironment {
  const raw = import.meta.env.VITE_APP_ENV ?? import.meta.env.MODE
  if (raw === 'production' || raw === 'staging' || raw === 'development') return raw
  return import.meta.env.PROD ? 'production' : 'development'
}

export const env = {
  /** AWS API / ALB origin — set per Vercel environment */
  apiUrl: resolveApiUrl(),
  apiTimeoutMs: Number(import.meta.env.VITE_API_TIMEOUT_MS ?? 30_000),
  apiRetryCount: Number(import.meta.env.VITE_API_RETRY_COUNT ?? 2),
  apiRetryDelayMs: Number(import.meta.env.VITE_API_RETRY_DELAY_MS ?? 500),
  appVersion: import.meta.env.VITE_APP_VERSION ?? '1.0.0',
  appEnv: resolveAppEnv(),
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
  /** CloudFront CDN base for static tenant assets (logos, branding) */
  cdnUrl: import.meta.env.VITE_CDN_URL ?? '',
  /**
   * Optional default tenant for staging demos only.
   * Production tenant context comes from JWT — never ship secrets here.
   */
  defaultTenantId: import.meta.env.VITE_TENANT_ID ?? '',
  sentryDsn: import.meta.env.VITE_SENTRY_DSN ?? '',
} as const

export const ROUTES = {
  login: '/login',
  register: '/register',
  appRoot: '/app',
  dashboard: '/app/dashboard',
  adminRoot: '/admin',
} as const

export const QUERY_KEYS = {
  documents: 'documents',
  document: 'document',
  dashboardStats: 'dashboard-stats',
  notifications: 'notifications',
} as const

export const PERMISSIONS = {
  documentsView: 'documents.view',
  documentsCreate: 'documents.create',
  documentsUpdate: 'documents.update',
  documentsDelete: 'documents.delete',
  documentsDownload: 'documents.download',
  documentsApprove: 'documents.approve',
  documentsEsign: 'documents.esign',
  workflowsManage: 'workflows.manage',
  usersManage: 'users.manage',
  rolesManage: 'roles.manage',
  reportsView: 'reports.view',
  billingManage: 'billing.manage',
  auditView: 'audit.view',
  settingsManage: 'settings.manage',
  recordsRetentionManage: 'records.retention.manage',
  recordsRestrictedView: 'records.restricted.view',
  recordsRestrictedDownload: 'records.restricted.download',
  recordsRequestCreate: 'records.request.create',
  recordsReleaseManage: 'records.release.manage',
  recordsDigitizationManage: 'records.digitization.manage',
  recordsReceivingManage: 'records.receiving.manage',
  recordsArchivesManage: 'records.archives.manage',
} as const

/** Feature-flag keys — wire to remote config when ready */
export const FEATURE_FLAGS = {
  auditLogs: 'feature.audit_logs',
  realtime: 'feature.realtime',
  intelligence: 'feature.document_intelligence',
} as const
