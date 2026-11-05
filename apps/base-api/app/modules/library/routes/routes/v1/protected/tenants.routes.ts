import router from '@adonisjs/core/services/router'

const TenantsController = () => import('#modules/library/controllers/tenants_controller')

export function registerTenantRoutes() {
  router.get('tenant', [TenantsController, 'current'])
  router.patch('tenant', [TenantsController, 'update'])
}
