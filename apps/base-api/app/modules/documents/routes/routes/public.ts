import router from '@adonisjs/core/services/router'
import { publicTrackThrottle } from '#start/limiter'

const PublicTrackController = () => import('#modules/documents/controllers/public_track_controller')
const TenantAssetsController = () => import('#modules/documents/controllers/tenant_assets_controller')

export function registerPublicRoutes() {
  router
    .group(() => {
      router
        .get('/track/:trackingNumber', [PublicTrackController, 'show'])
        .as('documents.public_track.show')
        .use(publicTrackThrottle)
      router
        .get('/public/track/:trackingNumber', [PublicTrackController, 'show'])
        .as('documents.public_track.api_show')
        .use(publicTrackThrottle)
      router
        .get('/uploads/tenants/:tenantId/:filename', [TenantAssetsController, 'show'])
        .as('documents.tenant_assets.show')
    })
    .prefix('/api/v1/documents').as('documents')
}
