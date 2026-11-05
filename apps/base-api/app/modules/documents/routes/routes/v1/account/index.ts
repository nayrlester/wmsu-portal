import router from '@adonisjs/core/services/router'
import { mw as middleware } from '#modules/documents/middleware_registry'
import { apiThrottle } from '#start/limiter'
import { registerAccountProfileRoutes } from './profile.js'
import { registerAccountTenantRoutes } from './tenant.js'
import { registerAccountBillingRoutes } from './billing.js'
import { registerAccountSecurityRoutes } from './security.js'
import { registerAccountDashboardRoutes } from './dashboard.js'
import { registerAccountDocumentRoutes } from './documents.js'
import { registerAccountPlatformDocumentRoutes } from './platform_documents.js'
import { registerAccountWorkflowRoutes } from './workflows.js'
import { registerAccountNotificationRoutes } from './notifications.js'
import { registerAccountSearchRoutes } from './search.js'
import { registerAccountCopilotRoutes } from './copilot.js'
import { registerAccountDepartmentRoutes } from './departments.js'
import { registerAccountDocumentTypeRoutes } from './document_types.js'
import { registerAccountRecordsRoutes } from './records.js'
import { registerAccountRecordRequestRoutes } from './record_requests.js'
import { registerAccountDigitizationReceivingRoutes } from './digitization_receiving.js'
import { registerAccountArchivesRoutes } from './archives.js'

export function registerAccountRoutes() {
  router
    .group(() => {
      registerAccountProfileRoutes()
      registerAccountTenantRoutes()
      registerAccountBillingRoutes()
      registerAccountSecurityRoutes()
      registerAccountDashboardRoutes()
      registerAccountSearchRoutes()
      registerAccountCopilotRoutes()
      registerAccountDepartmentRoutes()
      registerAccountDocumentTypeRoutes()
      registerAccountRecordsRoutes()
      registerAccountRecordRequestRoutes()
      registerAccountDigitizationReceivingRoutes()
      registerAccountArchivesRoutes()

      registerAccountPlatformDocumentRoutes()
      registerAccountDocumentRoutes()
      registerAccountWorkflowRoutes()
      registerAccountNotificationRoutes()
    })
    .prefix('account')
    .use([middleware.auth(), middleware.tenant(), apiThrottle])
}
