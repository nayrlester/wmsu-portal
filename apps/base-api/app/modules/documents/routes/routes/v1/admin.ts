import router from '@adonisjs/core/services/router'
import { mw as middleware } from '#modules/documents/middleware_registry'
import { apiThrottle } from '#start/limiter'

const AdminTenantsController = () => import('#modules/documents/controllers/admin_tenants_controller')
const AdminAnalyticsController = () => import('#modules/documents/controllers/admin_analytics_controller')
const AdminPlansController = () => import('#modules/documents/controllers/admin_plans_controller')
const AdminBillingController = () => import('#modules/documents/controllers/admin_billing_controller')

export function registerAdminRoutes() {
  router
    .group(() => {
      router.get('tenants', [AdminTenantsController, 'index'])
      router.post('tenants', [AdminTenantsController, 'store'])
      router.get('tenants/:id', [AdminTenantsController, 'show'])
      router.put('tenants/:id', [AdminTenantsController, 'update'])
      router.post('tenants/:id/suspend', [AdminTenantsController, 'suspend'])
      router.post('tenants/:id/activate', [AdminTenantsController, 'activate'])
      router.delete('tenants/:id', [AdminTenantsController, 'destroy'])

      router.get('analytics/overview', [AdminAnalyticsController, 'overview'])
      router.get('analytics/revenue', [AdminAnalyticsController, 'revenue'])
      router.get('analytics/tenants', [AdminAnalyticsController, 'tenantUsage'])

      router.get('plans', [AdminPlansController, 'index'])
      router.post('plans', [AdminPlansController, 'store'])
      router.get('plans/:id', [AdminPlansController, 'show'])
      router.put('plans/:id', [AdminPlansController, 'update'])

      router.get('billing/overview', [AdminBillingController, 'overview'])
    })
    .prefix('admin')
    .use([middleware.auth(), middleware.superAdmin(), apiThrottle])
}
