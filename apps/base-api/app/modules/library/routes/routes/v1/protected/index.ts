import { registerAuthRoutes } from '#modules/library/routes/routes/v1/protected/auth.routes'
import { registerTenantRoutes } from '#modules/library/routes/routes/v1/protected/tenants.routes'
import { registerUserRoutes } from '#modules/library/routes/routes/v1/protected/users.routes'
import { registerBookRoutes } from '#modules/library/routes/routes/v1/protected/books.routes'
import { registerMemberRoutes } from '#modules/library/routes/routes/v1/protected/members.routes'
import { registerBorrowingRoutes } from '#modules/library/routes/routes/v1/protected/borrowings.routes'
import { registerFineRoutes } from '#modules/library/routes/routes/v1/protected/fines.routes'
import { registerReservationRoutes } from '#modules/library/routes/routes/v1/protected/reservations.routes'
import { registerReportRoutes } from '#modules/library/routes/routes/v1/protected/reports.routes'
import { registerSearchRoutes } from '#modules/library/routes/routes/v1/protected/search.routes'
import { registerAiRoutes } from '#modules/library/routes/routes/v1/protected/ai.routes'
import { registerAnalyticsRoutes } from '#modules/library/routes/routes/v1/protected/analytics.routes'
import { registerNotificationRoutes } from '#modules/library/routes/routes/v1/protected/notifications.routes'
import { registerAuditLogRoutes } from '#modules/library/routes/routes/v1/protected/audit_logs.routes'
import { registerOpacRoutes } from '#modules/library/routes/routes/v1/protected/opac.routes'
import { registerPortalRoutes } from '#modules/library/routes/routes/v1/protected/portal.routes'
import { registerDigitalRoutes } from '#modules/library/routes/routes/v1/protected/digital.routes'
import { registerIntegrationRoutes } from '#modules/library/routes/routes/v1/protected/integrations.routes'
import { registerHardwareRoutes } from '#modules/library/routes/routes/v1/protected/hardware.routes'
import { registerCatalogImportRoutes } from '#modules/library/routes/routes/v1/protected/catalog_import.routes'
import { registerAttendanceRoutes } from '#modules/library/routes/routes/v1/protected/attendance.routes'
import { registerUlmisFoundationRoutes } from '#modules/library/routes/routes/v1/protected/ulmis_foundation.routes'
import { registerAcquisitionRoutes } from '#modules/library/routes/routes/v1/protected/acquisitions.routes'

export function registerProtectedRoutes() {
  registerAuthRoutes()
  registerTenantRoutes()
  registerUlmisFoundationRoutes()
  registerUserRoutes()
  registerBookRoutes()
  registerMemberRoutes()
  registerBorrowingRoutes()
  registerFineRoutes()
  registerReservationRoutes()
  registerAcquisitionRoutes()
  registerReportRoutes()
  registerSearchRoutes()
  registerAiRoutes()
  registerAnalyticsRoutes()
  registerNotificationRoutes()
  registerAuditLogRoutes()
  registerOpacRoutes()
  registerPortalRoutes()
  registerDigitalRoutes()
  registerIntegrationRoutes()
  registerHardwareRoutes()
  registerCatalogImportRoutes()
  registerAttendanceRoutes()
}
