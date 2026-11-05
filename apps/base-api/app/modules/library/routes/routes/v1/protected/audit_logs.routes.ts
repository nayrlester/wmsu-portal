import router from '@adonisjs/core/services/router'

const AuditLogsController = () => import('#modules/library/controllers/audit_logs_controller')

export function registerAuditLogRoutes() {
  router.get('audit-logs', [AuditLogsController, 'index'])
}
