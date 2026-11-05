import router from '@adonisjs/core/services/router'

const ReportsController = () => import('#modules/library/controllers/reports_controller')

export function registerReportRoutes() {
  router.get('reports', [ReportsController, 'types'])
  router.get('reports/:type', [ReportsController, 'show'])
}
