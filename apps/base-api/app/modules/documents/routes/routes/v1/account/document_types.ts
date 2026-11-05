import router from '@adonisjs/core/services/router'
import { mw as middleware } from '#modules/documents/middleware_registry'

const DocumentTypesController = () => import('#modules/documents/controllers/document_types_controller')
const settingsManage = () => middleware.permission(['settings.manage'])

export function registerAccountDocumentTypeRoutes() {
  router.get('document-types', [DocumentTypesController, 'index']).use(settingsManage())
  router.post('document-types', [DocumentTypesController, 'store']).use(settingsManage())
  router.put('document-types/:id', [DocumentTypesController, 'update']).use(settingsManage())
  router.delete('document-types/:id', [DocumentTypesController, 'destroy']).use(settingsManage())
}
