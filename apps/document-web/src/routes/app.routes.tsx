import { lazy, Suspense, type ComponentType } from 'react'
import { Route, Navigate } from 'react-router-dom'
import { AuthGuard } from '@/routes/guards/auth-guard'
import { OnboardingGuard } from '@/routes/guards/onboarding-guard'
import { PermissionGuard } from '@/routes/guards/permission-guard'
import { AdminGuard } from '@/routes/guards/admin-guard'
import { RouteFallback } from '@/components/shared/route-fallback'
import { PERMISSIONS } from '@/shared/constants/env'
import {
  DashboardPage,
  DocumentsListPage,
  CreateDocumentPage,
  FilePlanPage,
  MyWorkPage,
  LifecycleDeskPage,
  DocumentDetailPage,
  PlatformDocumentsPage,
  SearchResultsPage,
  ApprovalsPage,
  RecordRequestsPage,
  CreateRecordRequestPage,
  RecordRequestDetailPage,
  DigitizationBatchesPage,
  DigitizationBatchDetailPage,
  ReceivingDeskPage,
  ReceivingReceiptDetailPage,
  ArchivesDeskPage,
  WorkflowsPage,
  ReportsPage,
  NotificationsPage,
  AuditLogsPage,
  SettingsPage,
  ProfilePage,
  TeamPage,
  OnboardingPage,
} from '@/routes/lazy-pages'

const AppLayout = lazy(() =>
  import('@/layouts/app-layout').then((module) => ({ default: module.AppLayout }))
)

const suspense = (Page: ComponentType) => (
  <Suspense fallback={<RouteFallback />}>
    <Page />
  </Suspense>
)

const appShell = (
  <Suspense fallback={<RouteFallback />}>
    <AppLayout />
  </Suspense>
)

export const appRoutes = (
  <Route element={<AuthGuard />}>
    <Route path="/app/onboarding" element={suspense(OnboardingPage)} />
    <Route element={<OnboardingGuard />}>
      <Route path="/app" element={appShell}>
      <Route index element={<Navigate to="dashboard" replace />} />
      <Route path="dashboard" element={suspense(DashboardPage)} />
      <Route element={<AdminGuard />}>
        <Route path="documents/platform" element={suspense(PlatformDocumentsPage)} />
      </Route>
      <Route element={<PermissionGuard permission={PERMISSIONS.documentsCreate} fallback="/app/documents" />}>
        <Route path="documents/create" element={suspense(CreateDocumentPage)} />
      </Route>
      <Route element={<PermissionGuard permission={PERMISSIONS.documentsView} />}>
        <Route path="documents" element={suspense(DocumentsListPage)} />
        <Route path="documents/file-plan" element={suspense(FilePlanPage)} />
        <Route path="documents/:id" element={suspense(DocumentDetailPage)} />
        <Route path="my-work" element={suspense(MyWorkPage)} />
        <Route path="lifecycle" element={suspense(LifecycleDeskPage)} />
        <Route path="search" element={suspense(SearchResultsPage)} />
      </Route>
      <Route element={<PermissionGuard permission={PERMISSIONS.documentsApprove} />}>
        <Route path="approvals" element={suspense(ApprovalsPage)} />
      </Route>
      <Route element={<PermissionGuard permission={PERMISSIONS.recordsRequestCreate} />}>
        <Route path="records/requests" element={suspense(RecordRequestsPage)} />
        <Route path="records/requests/new" element={suspense(CreateRecordRequestPage)} />
        <Route path="records/requests/:id" element={suspense(RecordRequestDetailPage)} />
      </Route>
      <Route element={<PermissionGuard permission={PERMISSIONS.recordsDigitizationManage} />}>
        <Route path="records/digitization" element={suspense(DigitizationBatchesPage)} />
        <Route path="records/digitization/:id" element={suspense(DigitizationBatchDetailPage)} />
      </Route>
      <Route element={<PermissionGuard permission={PERMISSIONS.recordsReceivingManage} />}>
        <Route path="records/receiving" element={suspense(ReceivingDeskPage)} />
        <Route path="records/receiving/:id" element={suspense(ReceivingReceiptDetailPage)} />
      </Route>
      <Route element={<PermissionGuard permission={PERMISSIONS.recordsArchivesManage} />}>
        <Route path="records/archives" element={suspense(ArchivesDeskPage)} />
      </Route>
      <Route element={<PermissionGuard permission={PERMISSIONS.workflowsManage} />}>
        <Route path="workflows" element={suspense(WorkflowsPage)} />
      </Route>
      <Route element={<PermissionGuard permission={PERMISSIONS.reportsView} />}>
        <Route path="reports" element={suspense(ReportsPage)} />
      </Route>
      <Route element={<PermissionGuard permission={PERMISSIONS.documentsCreate} />}>
        <Route path="notifications" element={suspense(NotificationsPage)} />
      </Route>
      <Route element={<PermissionGuard permission={PERMISSIONS.auditView} />}>
        <Route path="audit-logs" element={suspense(AuditLogsPage)} />
      </Route>
      <Route element={<PermissionGuard permission={PERMISSIONS.usersManage} />}>
        <Route path="team" element={suspense(TeamPage)} />
      </Route>
      <Route path="profile" element={suspense(ProfilePage)} />
      <Route element={<PermissionGuard permission={PERMISSIONS.settingsManage} />}>
        <Route path="settings" element={suspense(SettingsPage)} />
      </Route>
      </Route>
    </Route>
  </Route>
)
