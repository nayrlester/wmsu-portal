import router from '@adonisjs/core/services/router'
import { mw as middleware } from '#modules/library/middleware_registry'

const AuthController = () => import('#modules/library/controllers/auth_controller')
const RegisterController = () => import('#modules/library/controllers/register_controller')
const TenantsController = () => import('#modules/library/controllers/tenants_controller')
const DocsController = () => import('#modules/library/controllers/docs_controller')
const PublicOpacController = () => import('#modules/library/controllers/public_opac_controller')
const PublicElibraryController = () => import('#modules/library/controllers/public_elibrary_controller')
const HardwareController = () => import('#modules/library/controllers/hardware_controller')

export function registerPublicRoutes() {
  router.get('docs', [DocsController, 'swagger'])
  router.get('docs/openapi.yaml', [DocsController, 'openapi'])

  router.get('tenants/resolve', [TenantsController, 'resolve'])

  router.post('auth/register', [RegisterController, 'store'])
  router.post('auth/login', [AuthController, 'login']).use(middleware.tenant())
  router.post('auth/refresh', [AuthController, 'refresh'])

  // Public OPAC + queue display (tenant header required)
  router
    .group(() => {
      router.get('public/opac/search', [PublicOpacController, 'search'])
      router.get('public/opac/books/:id', [PublicOpacController, 'show'])
      router.get('public/opac/books/:id/citations', [PublicOpacController, 'cite'])
      router.get('public/elibrary/search', [PublicElibraryController, 'search'])
      router.get('public/elibrary/repository/:id', [PublicElibraryController, 'openRepository'])
      router.post('public/elibrary/eresources/:id/open', [PublicElibraryController, 'openElectronic'])
      router
        .get('public/queue/board', [HardwareController, 'queueBoard'])
        .as('public.queue_board')
      router.get('public/locator', [HardwareController, 'publicLocate'])
    })
    .use(middleware.tenant())
}
