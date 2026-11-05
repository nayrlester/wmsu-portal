export { apiClient, api } from './client'
export { apiConfig, API_HEADERS } from './config'

export { ApiError, normalizeAxiosError } from './errors/api-error'
export { apiRequest, apiRequestVoid } from './utils/request'

export { tenantContext } from './lib/tenant-context'
export { sessionManager } from './lib/session-manager'

export { authApi } from './modules/auth.api'
export type { AuthUser, AuthTokens, AuthRole, AuthProfile, LoginResponse, RegisterInput } from './modules/auth.api'

export { documentsApi } from './modules/documents.api'
export { platformDocumentsApi } from './modules/platform-documents.api'
export { esignApi, recordsApi } from './modules/records.api'
export type { EsignEnvelope, RetentionSchedule, RecordsSummary } from './modules/records.api'
export { searchApi } from './modules/search.api'
export { copilotApi } from './modules/copilot.api'
export type { SearchParams } from './modules/search.api'
export { workflowsApi } from './modules/workflows.api'
export type { CreateWorkflowInput } from './modules/workflows.api'
export { approvalsApi } from './modules/approvals.api'
export type { ApprovalRecord, ApprovalActionInput } from './modules/approvals.api'
export { notificationsApi } from './modules/notifications.api'
export type { NotificationRecord, NotificationListResponse } from './modules/notifications.api'
export {
  rolesApi,
  settingsApi,
  billingApi,
  dashboardApi,
  permissionsApi,
} from './modules/platform.api'
export { usersApi } from './modules/users.api'
export type {
  CreateTenantUserInput,
  UpdateTenantUserInput,
  CreateTenantUserResponse,
} from './modules/users.api'
export { trackApi } from './modules/track.api'
export { adminApi, formatBytes, formatCurrency } from './modules/admin.api'
export type {
  PlatformOverview,
  AdminPlan,
  AdminTenant,
  TenantUsageRow,
  BillingOverview,
} from './modules/admin.api'

export type {
  ApiErrorCode,
  ValidationFieldError,
  ApiErrorPayload,
  ApiListParams,
} from './types'

export type {
  DepartmentRecord,
  DocumentTypeRecord,
  ActivityRecord,
  FileRecord,
} from '@/features/documents/types/document.types'
