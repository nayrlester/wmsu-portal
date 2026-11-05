/*
|--------------------------------------------------------------------------
| HTTP kernel file
|--------------------------------------------------------------------------
*/

import router from '@adonisjs/core/services/router'
import server from '@adonisjs/core/services/server'

server.errorHandler(() => import('#modules/library/exceptions/handler'))

server.use([
  () => import('#modules/library/middleware/force_json_response_middleware'),
  () => import('#modules/library/middleware/container_bindings_middleware'),
  () => import('#modules/library/middleware/request_id_middleware'),
  () => import('@adonisjs/cors/cors_middleware'),
])

router.use([
  () => import('@adonisjs/core/bodyparser_middleware'),
  () => import('@adonisjs/shield/shield_middleware'),
  () => import('#modules/library/middleware/rate_limit_middleware'),
  () => import('#modules/library/middleware/request_logging_middleware'),
])

export const middleware = router.named({
  tenant: () => import('#modules/library/middleware/tenant_resolver_middleware'),
  jwt: () => import('#modules/library/middleware/jwt_auth_middleware'),
  kiosk: () => import('#modules/library/middleware/kiosk_device_middleware'),
  serviceApiKey: () => import('#modules/library/middleware/service_api_key_middleware'),
})
