import { lazy, type ComponentType } from 'react'

function lazyNamed<T extends Record<string, unknown>, K extends keyof T>(
  factory: () => Promise<T>,
  name: K
) {
  return lazy(() =>
    factory().then((module) => ({ default: module[name] as ComponentType<unknown> }))
  )
}

// Marketing
export const PricingPage = lazyNamed(() => import('@/pages/pricing-page'), 'PricingPage')
export const PublicTrackPage = lazyNamed(() => import('@/pages/public-track-page'), 'PublicTrackPage')

// Onboarding
export const OnboardingPage = lazyNamed(
  () => import('@/features/onboarding/pages/onboarding.page'),
  'OnboardingPage'
)

// Auth
export const LoginPage = lazyNamed(() => import('@/pages/login-page'), 'LoginPage')
export const RegisterPage = lazyNamed(() => import('@/pages/register-page'), 'RegisterPage')

// Tenant app
export const DashboardPage = lazyNamed(() => import('@/pages/dashboard-page'), 'DashboardPage')
export const DocumentsListPage = lazyNamed(
  () => import('@/features/documents/pages/documents-list.page'),
  'DocumentsListPage'
)
export const CreateDocumentPage = lazyNamed(
  () => import('@/features/documents/pages/create-document.page'),
  'CreateDocumentPage'
)
export const FilePlanPage = lazyNamed(
  () => import('@/features/documents/pages/file-plan.page'),
  'FilePlanPage'
)
export const MyWorkPage = lazyNamed(
  () => import('@/features/documents/pages/my-work.page'),
  'MyWorkPage'
)
export const LifecycleDeskPage = lazyNamed(
  () => import('@/features/documents/pages/lifecycle-desk.page'),
  'LifecycleDeskPage'
)
export const DocumentDetailPage = lazyNamed(
  () => import('@/features/documents/pages/document-detail.page'),
  'DocumentDetailPage'
)
export const PlatformDocumentsPage = lazyNamed(
  () => import('@/features/documents/pages/platform-documents.page'),
  'PlatformDocumentsPage'
)
export const SearchResultsPage = lazyNamed(
  () => import('@/features/search/pages/search-results.page'),
  'SearchResultsPage'
)
export const ApprovalsPage = lazyNamed(() => import('@/pages/approvals-page'), 'ApprovalsPage')
export const RecordRequestsPage = lazyNamed(
  () => import('@/features/records/pages/record-requests.page'),
  'RecordRequestsPage'
)
export const CreateRecordRequestPage = lazyNamed(
  () => import('@/features/records/pages/create-record-request.page'),
  'CreateRecordRequestPage'
)
export const RecordRequestDetailPage = lazyNamed(
  () => import('@/features/records/pages/record-request-detail.page'),
  'RecordRequestDetailPage'
)
export const DigitizationBatchesPage = lazyNamed(
  () => import('@/features/records/pages/digitization-batches.page'),
  'DigitizationBatchesPage'
)
export const DigitizationBatchDetailPage = lazyNamed(
  () => import('@/features/records/pages/digitization-batch-detail.page'),
  'DigitizationBatchDetailPage'
)
export const ReceivingDeskPage = lazyNamed(
  () => import('@/features/records/pages/receiving-desk.page'),
  'ReceivingDeskPage'
)
export const ReceivingReceiptDetailPage = lazyNamed(
  () => import('@/features/records/pages/receiving-receipt-detail.page'),
  'ReceivingReceiptDetailPage'
)
export const ArchivesDeskPage = lazyNamed(
  () => import('@/features/records/pages/archives-desk.page'),
  'ArchivesDeskPage'
)
export const WorkflowsPage = lazyNamed(() => import('@/pages/workflows-page'), 'WorkflowsPage')
export const ReportsPage = lazyNamed(() => import('@/pages/reports-page'), 'ReportsPage')
export const NotificationsPage = lazyNamed(() => import('@/pages/notifications-page'), 'NotificationsPage')
export const AuditLogsPage = lazyNamed(() => import('@/pages/audit-logs-page'), 'AuditLogsPage')
export const SettingsPage = lazyNamed(() => import('@/pages/settings-page'), 'SettingsPage')
export const ProfilePage = lazyNamed(() => import('@/pages/profile-page'), 'ProfilePage')
export const TeamPage = lazyNamed(() => import('@/pages/team-page'), 'TeamPage')

// Admin
export const AdminDashboardPage = lazyNamed(
  () => import('@/pages/admin/admin-dashboard-page'),
  'AdminDashboardPage'
)
export const AdminTenantsPage = lazyNamed(
  () => import('@/pages/admin/admin-tenants-page'),
  'AdminTenantsPage'
)
export const AdminPlansPage = lazyNamed(() => import('@/pages/admin/admin-plans-page'), 'AdminPlansPage')
export const AdminBillingPage = lazyNamed(
  () => import('@/pages/admin/admin-billing-page'),
  'AdminBillingPage'
)
