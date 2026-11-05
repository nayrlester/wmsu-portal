import router from '@adonisjs/core/services/router'

const HealthController = () => import('#modules/documents/controllers/health_controller')
const MetricsController = () => import('#modules/documents/controllers/metrics_controller')

export function registerInfrastructureRoutes() {
  router
    .group(() => {
      router.get('/_engine_health/live', [HealthController, 'live']).as('documents.health.live')
      router.get('/_engine_health/ready', [HealthController, 'ready']).as('documents.health.ready')
      router.get('/metrics', [MetricsController, 'index']).as('documents.metrics')
    })
    .prefix('/api/v1/documents').as('documents')
}
