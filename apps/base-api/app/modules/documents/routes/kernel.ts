/*
|--------------------------------------------------------------------------
| HTTP kernel file
|--------------------------------------------------------------------------
*/

import router from '@adonisjs/core/services/router'
import server from '@adonisjs/core/services/server'

server.errorHandler(() => import('#modules/documents/exceptions/handler'))

server.use([
  () => import('#modules/documents/middleware/force_json_response_middleware'),
  () => import('#modules/documents/middleware/container_bindings_middleware'),
  () => import('#modules/documents/middleware/metrics_middleware'),
  () => import('#modules/documents/middleware/slow_request_middleware'),
  () => import('@adonisjs/cors/cors_middleware'),
])

router.use([
  () => import('@adonisjs/core/bodyparser_middleware'),
  () => import('@adonisjs/session/session_middleware'),
  () => import('@adonisjs/shield/shield_middleware'),
  () => import('@adonisjs/auth/initialize_auth_middleware'),
  () => import('#modules/documents/middleware/silent_auth_middleware'),
  () => import('#modules/documents/middleware/compression_middleware'),
  () => import('#modules/documents/middleware/api_cache_middleware'),
])

export const middleware = router.named({
  auth: () => import('#modules/documents/middleware/auth_middleware'),
  tenant: () => import('#modules/documents/middleware/tenant_middleware'),
  permission: () => import('#modules/documents/middleware/permission_middleware'),
  superAdmin: () => import('#modules/documents/middleware/super_admin_middleware'),
  tenantAdmin: () => import('#modules/documents/middleware/tenant_admin_middleware'),
  serviceApiKey: () => import('#modules/documents/middleware/service_api_key_middleware'),
})
