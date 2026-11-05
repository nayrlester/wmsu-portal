import router from '@adonisjs/core/services/router'

const OpacController = () => import('#modules/library/controllers/opac_controller')

export function registerOpacRoutes() {
  router.get('opac/search', [OpacController, 'search'])
  router.get('opac/books/:id', [OpacController, 'show'])
  router.get('opac/books/:id/citations', [OpacController, 'cite'])
}
