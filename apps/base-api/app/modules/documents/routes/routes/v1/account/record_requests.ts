import router from '@adonisjs/core/services/router'
import { mw as middleware } from '#modules/documents/middleware_registry'

const RecordRequestsController = () => import('#modules/documents/controllers/record_requests_controller')

const create = () => middleware.permission(['records.request.create'])
const manage = () => middleware.permission(['records.release.manage'])

export function registerAccountRecordRequestRoutes() {
  // Requesters and desk staff both receive records.request.create (desk also has manage).
  router.get('record-requests', [RecordRequestsController, 'index']).use(create())
  router.post('record-requests', [RecordRequestsController, 'store']).use(create())
  router.get('record-requests/:id', [RecordRequestsController, 'show']).use(create())
  router.post('record-requests/:id/approve', [RecordRequestsController, 'approve']).use(manage())
  router.post('record-requests/:id/deny', [RecordRequestsController, 'deny']).use(manage())
  router.post('record-requests/:id/release', [RecordRequestsController, 'release']).use(manage())
  router.post('record-requests/:id/return', [RecordRequestsController, 'returnItems']).use(manage())
  router.post('record-requests/:id/cancel', [RecordRequestsController, 'cancel']).use(create())
}
