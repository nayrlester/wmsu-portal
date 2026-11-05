import router from '@adonisjs/core/services/router'
import { mw as middleware } from '#modules/documents/middleware_registry'

const RetentionSchedulesController = () => import('#modules/documents/controllers/retention_schedules_controller')
const RecordsController = () => import('#modules/documents/controllers/records_controller')

const view = () => middleware.permission(['documents.view'])
const update = () => middleware.permission(['documents.update'])
const retentionManage = () => middleware.permission(['records.retention.manage'])
const reports = () => middleware.permission(['reports.view'])

export function registerAccountRecordsRoutes() {
  router.get('retention-schedules', [RetentionSchedulesController, 'index']).use(view())
  router.post('retention-schedules', [RetentionSchedulesController, 'store']).use(retentionManage())
  router
    .post('retention-schedules/agency-packs', [RetentionSchedulesController, 'applyAgencyPacks'])
    .use(retentionManage())
  router.put('retention-schedules/:id', [RetentionSchedulesController, 'update']).use(retentionManage())
  router
    .delete('retention-schedules/:id', [RetentionSchedulesController, 'destroy'])
    .use(retentionManage())

  router.get('records/inventory', [RecordsController, 'inventory']).use(reports())
  router.get('records/summary', [RecordsController, 'summary']).use(reports())
  router.get('records/ops-report', [RecordsController, 'opsReport']).use(reports())
  router
    .post('documents/:id/lifecycle', [RecordsController, 'updateLifecycle'])
    .use(update())
}
