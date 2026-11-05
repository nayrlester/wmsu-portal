import router from '@adonisjs/core/services/router'
import { mw as middleware } from '#modules/library/middleware_registry'
import { registerPublicRoutes } from '#modules/library/routes/routes/v1/public.routes'
import { registerProtectedRoutes } from '#modules/library/routes/routes/v1/protected/index'
import { registerKioskRoutes } from '#modules/library/routes/routes/v1/kiosk.routes'
import { registerInternalRoutes } from '#modules/library/routes/routes/v1/internal.routes'

router
  .group(() => {
    registerPublicRoutes()
    registerKioskRoutes()

    router
      .group(() => {
        registerProtectedRoutes()
      })
      .use(middleware.tenant())
      .use(middleware.jwt())

    router
      .group(() => {
        registerInternalRoutes()
      })
      .prefix('/internal')
      .use(middleware.serviceApiKey())
  })
  .prefix('/api/v1/library').as('library')
