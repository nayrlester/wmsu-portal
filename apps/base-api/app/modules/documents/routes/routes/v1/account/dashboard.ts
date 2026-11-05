import router from '@adonisjs/core/services/router'
import { mw as middleware } from '#modules/documents/middleware_registry'

const DashboardController = () => import('#modules/documents/controllers/dashboard_controller')

const reportsView = () => middleware.permission(['reports.view'])

export function registerAccountDashboardRoutes() {
  router.get('dashboard/stats', [DashboardController, 'stats'])
  router.get('dashboard/overview', [DashboardController, 'overview'])
  router.get('dashboard/trend', [DashboardController, 'trend']).use(reportsView())
  router.get('dashboard/usage-trend', [DashboardController, 'usageTrend']).use(reportsView())
  router.get('dashboard/files-trend', [DashboardController, 'filesTrend']).use(reportsView())
  router.get('dashboard/user-access', [DashboardController, 'userAccess'])
}
