import router from '@adonisjs/core/services/router'
import { mw as middleware } from '#modules/documents/middleware_registry'

const PlatformDocumentsController = () => import('#modules/documents/controllers/platform_documents_controller')

const adminOnly = () => middleware.tenantAdmin()

export function registerAccountPlatformDocumentRoutes() {
  router.get('platform-documents', [PlatformDocumentsController, 'index']).use(adminOnly())
  router
    .get('platform-documents/:id/download', [PlatformDocumentsController, 'download'])
    .use(adminOnly())
}
