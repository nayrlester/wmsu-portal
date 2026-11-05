import router from '@adonisjs/core/services/router'
import { mw as middleware } from '#modules/documents/middleware_registry'

const DocumentsHubController = () => import('#modules/documents/controllers/documents_hub_controller')

/** M2M document hub — no JWT; X-Service-Api-Key only. */
export function registerDocumentsHubRoutes() {
  router
    .group(() => {
      router.post('documents', [DocumentsHubController, 'store'])
      router.get('documents', [DocumentsHubController, 'index'])
      router.get('documents/:id/download', [DocumentsHubController, 'download'])
    })
    .prefix('/api/v1/documents').as('documents')
    .use(middleware.serviceApiKey())
}
