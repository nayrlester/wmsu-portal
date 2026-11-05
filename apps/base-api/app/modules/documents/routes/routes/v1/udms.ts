import router from '@adonisjs/core/services/router'
import { mw as middleware } from '#modules/documents/middleware_registry'
import { apiThrottle } from '#start/limiter'

const UdmsFoundationController = () => import('#modules/documents/controllers/udms_foundation_controller')
const UdmsRepositoryController = () => import('#modules/documents/controllers/udms_repository_controller')
const UdmsWorkflowController = () => import('#modules/documents/controllers/udms_workflow_controller')
const UdmsLifecycleController = () => import('#modules/documents/controllers/udms_lifecycle_controller')
const UdmsReportsController = () => import('#modules/documents/controllers/udms_reports_controller')

const settingsManage = () => middleware.permission(['settings.manage'])
const documentsView = () => middleware.permission(['documents.view'])
const documentsCreate = () => middleware.permission(['documents.create'])
const documentsUpdate = () => middleware.permission(['documents.update'])
const documentsApprove = () => middleware.permission(['documents.approve'])
const retentionManage = () => middleware.permission(['records.retention.manage'])
const archivesManage = () => middleware.permission(['records.archives.manage'])
const reportsView = () => middleware.permission(['reports.view'])

export function registerUdmsFoundationRoutes() {
  router
    .group(() => {
      router.get('foundation/status', [UdmsFoundationController, 'status']).use(settingsManage())
      router.get('settings', [UdmsFoundationController, 'listSettings']).use(settingsManage())
      router.put('settings', [UdmsFoundationController, 'upsertSetting']).use(settingsManage())
      router
        .get('integrations/contracts', [UdmsFoundationController, 'listContracts'])
        .use(settingsManage())
      router
        .get('integrations/outbox', [UdmsFoundationController, 'listOutbox'])
        .use(settingsManage())

      router.get('repository', [UdmsRepositoryController, 'list']).use(documentsView())
      router.post('repository/register', [UdmsRepositoryController, 'register']).use(documentsCreate())
      router.get('repository/:id', [UdmsRepositoryController, 'show']).use(documentsView())
      router
        .put('repository/:id/metadata', [UdmsRepositoryController, 'updateMetadata'])
        .use(documentsUpdate())

      router.get('file-plan', [UdmsRepositoryController, 'listFilePlan']).use(documentsView())
      router.post('file-plan', [UdmsRepositoryController, 'createFilePlan']).use(settingsManage())
      router.put('file-plan/:id', [UdmsRepositoryController, 'updateFilePlan']).use(settingsManage())
      router
        .delete('file-plan/:id', [UdmsRepositoryController, 'destroyFilePlan'])
        .use(settingsManage())

      router
        .get('workflow/queues/assigned', [UdmsWorkflowController, 'assignedQueue'])
        .use(documentsView())
      router
        .get('workflow/queues/office', [UdmsWorkflowController, 'officeQueue'])
        .use(documentsView())
      router
        .get('workflow/queues/awaiting-action', [UdmsWorkflowController, 'awaitingQueue'])
        .use(documentsView())
      router
        .get('workflow/documents/:id/tracking', [UdmsWorkflowController, 'tracking'])
        .use(documentsView())
      router
        .post('workflow/documents/:id/assign', [UdmsWorkflowController, 'assign'])
        .use(documentsUpdate())
      router
        .post('workflow/documents/:id/route', [UdmsWorkflowController, 'route'])
        .use(documentsUpdate())
      router
        .post('workflow/documents/:id/actions', [UdmsWorkflowController, 'act'])
        .use(documentsApprove())

      router
        .get('lifecycle/documents/:id/versions', [UdmsLifecycleController, 'listVersions'])
        .use(documentsView())
      router
        .post('lifecycle/documents/:id/versions', [UdmsLifecycleController, 'createVersion'])
        .use(documentsUpdate())
      router
        .get('lifecycle/documents/:id/summary', [UdmsLifecycleController, 'summary'])
        .use(documentsView())
      router
        .post('lifecycle/documents/:id/archive', [UdmsLifecycleController, 'archive'])
        .use(documentsUpdate())
      router
        .post('lifecycle/documents/:id/restore', [UdmsLifecycleController, 'restore'])
        .use(archivesManage())
      router
        .post('lifecycle/documents/:id/retention', [UdmsLifecycleController, 'applyRetention'])
        .use(retentionManage())
      router
        .post('lifecycle/documents/:id/lifecycle', [UdmsLifecycleController, 'setLifecycle'])
        .use(retentionManage())
      router
        .post('lifecycle/documents/:id/legal-hold', [UdmsLifecycleController, 'setLegalHold'])
        .use(archivesManage())

      router.get('lifecycle/archived', [UdmsLifecycleController, 'listArchived']).use(documentsView())
      router
        .get('lifecycle/retention/schedules', [UdmsLifecycleController, 'listSchedules'])
        .use(documentsView())
      router
        .get('lifecycle/retention/due', [UdmsLifecycleController, 'listRetentionDue'])
        .use(retentionManage())

      router
        .get('lifecycle/transfers', [UdmsLifecycleController, 'listTransfers'])
        .use(archivesManage())
      router
        .post('lifecycle/transfers', [UdmsLifecycleController, 'createTransfer'])
        .use(archivesManage())
      router
        .post('lifecycle/transfers/:id/approve', [UdmsLifecycleController, 'approveTransfer'])
        .use(archivesManage())
      router
        .post('lifecycle/transfers/:id/complete', [UdmsLifecycleController, 'completeTransfer'])
        .use(archivesManage())

      router
        .get('lifecycle/disposals', [UdmsLifecycleController, 'listDisposals'])
        .use(archivesManage())
      router
        .post('lifecycle/disposals', [UdmsLifecycleController, 'createDisposal'])
        .use(archivesManage())
      router
        .post('lifecycle/disposals/:id/approve', [UdmsLifecycleController, 'approveDisposal'])
        .use(archivesManage())
      router
        .post('lifecycle/disposals/:id/execute', [UdmsLifecycleController, 'executeDisposal'])
        .use(archivesManage())

      router.get('reports/dashboard', [UdmsReportsController, 'dashboard']).use(reportsView())
      router
        .get('reports/registration', [UdmsReportsController, 'registration'])
        .use(reportsView())
      router.get('reports/workflow', [UdmsReportsController, 'workflow']).use(reportsView())
      router.get('reports/archival', [UdmsReportsController, 'archival']).use(reportsView())
      router.get('reports/printable', [UdmsReportsController, 'printable']).use(reportsView())
    })
    .prefix('udms')
    .use([middleware.auth(), middleware.tenant(), apiThrottle])
}
