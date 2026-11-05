import router from '@adonisjs/core/services/router'
import { mw as middleware } from '#modules/documents/middleware_registry'

const SessionsController = () => import('#modules/documents/controllers/sessions_controller')
const MfaController = () => import('#modules/documents/controllers/mfa_controller')
const PermissionsController = () => import('#modules/documents/controllers/permissions_controller')
const RolesController = () => import('#modules/documents/controllers/roles_controller')
const UsersController = () => import('#modules/documents/controllers/users_controller')
const AuditLogsController = () => import('#modules/documents/controllers/audit_logs_controller')

const usersManage = () => middleware.permission(['users.manage'])
const auditView = () => middleware.permission(['audit.view'])

export function registerAccountSecurityRoutes() {
  router.get('sessions', [SessionsController, 'index'])
  router.delete('sessions/:id', [SessionsController, 'destroy'])
  router.post('sessions/revoke-all', [SessionsController, 'destroyAll'])

  router.get('mfa/status', [MfaController, 'status'])
  router.post('mfa/setup', [MfaController, 'setup'])
  router.post('mfa/enable', [MfaController, 'enable'])
  router.post('mfa/disable', [MfaController, 'disable'])

  router.get('permissions', [PermissionsController, 'index']).use(middleware.permission(['roles.manage']))
  router.get('permissions/me', [PermissionsController, 'myPermissions'])

  router.get('roles', [RolesController, 'index']).use(middleware.permission(['roles.manage']))
  router.post('roles', [RolesController, 'store']).use(middleware.permission(['roles.manage']))
  router.get('roles/:id', [RolesController, 'show']).use(middleware.permission(['roles.manage']))
  router.put('roles/:id', [RolesController, 'update']).use(middleware.permission(['roles.manage']))
  router
    .put('roles/:id/permissions', [RolesController, 'updatePermissions'])
    .use(middleware.permission(['roles.manage']))
  router.delete('roles/:id', [RolesController, 'destroy']).use(middleware.permission(['roles.manage']))
  router
    .post('users/:userId/roles', [RolesController, 'assignToUser'])
    .use(usersManage())

  router.get('users', [UsersController, 'index']).use(usersManage())
  router.get('users/assignable-roles', [UsersController, 'assignableRoles']).use(usersManage())
  router.post('users', [UsersController, 'store']).use(usersManage())
  router.put('users/:id', [UsersController, 'update']).use(usersManage())
  router.delete('users/:id', [UsersController, 'destroy']).use(usersManage())

  router.get('audit-logs', [AuditLogsController, 'index']).use(auditView())
  router.get('audit-logs/verify-chain', [AuditLogsController, 'verifyChain']).use(auditView())
}
