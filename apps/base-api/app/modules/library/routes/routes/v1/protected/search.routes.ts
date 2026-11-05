import router from '@adonisjs/core/services/router'

const SearchController = () => import('#modules/library/controllers/search_controller')

export function registerSearchRoutes() {
  router.get('search', [SearchController, 'index'])
  router.get('search/recent', [SearchController, 'recent'])
  router.get('search/saved', [SearchController, 'saved'])
  router.post('search/saved', [SearchController, 'storeSaved'])
  router.delete('search/saved/:id', [SearchController, 'destroySaved'])
}
