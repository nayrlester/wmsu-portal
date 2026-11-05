import router from '@adonisjs/core/services/router'

const AnalyticsController = () => import('#modules/library/controllers/analytics_controller')

export function registerAnalyticsRoutes() {
  router.get('analytics/dashboard', [AnalyticsController, 'dashboard'])
}
