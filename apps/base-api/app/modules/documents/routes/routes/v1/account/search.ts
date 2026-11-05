import router from '@adonisjs/core/services/router'
import { mw as middleware } from '#modules/documents/middleware_registry'

const SearchController = () => import('#modules/documents/controllers/search_controller')

export function registerAccountSearchRoutes() {
  router.get('search', [SearchController, 'index']).use(middleware.permission(['documents.view']))
  router
    .post('search/image', [SearchController, 'searchByImage'])
    .use(middleware.permission(['documents.view']))
}
