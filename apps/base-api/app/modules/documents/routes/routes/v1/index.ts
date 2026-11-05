import router from '@adonisjs/core/services/router'
import { registerDocsRoutes } from './docs.js'
import { registerV1PublicRoutes } from './public.js'
import { registerAuthRoutes } from './auth.js'
import { registerAdminRoutes } from './admin.js'
import { registerAccountRoutes } from './account/index.js'
import { registerUdmsFoundationRoutes } from './udms.js'

export function registerV1Routes() {
  router
    .group(() => {
      registerDocsRoutes()
      registerV1PublicRoutes()
      registerAuthRoutes()
      registerAdminRoutes()
      registerAccountRoutes()
      registerUdmsFoundationRoutes()
    })
    .prefix('/api/v1/documents').as('documents')
}
