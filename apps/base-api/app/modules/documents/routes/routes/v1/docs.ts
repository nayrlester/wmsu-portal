import router from '@adonisjs/core/services/router'

const DocsController = () => import('#modules/documents/controllers/docs_controller')

export function registerDocsRoutes() {
  router.get('docs', [DocsController, 'swagger'])
  router.get('docs/openapi.yaml', [DocsController, 'openapi'])
}
