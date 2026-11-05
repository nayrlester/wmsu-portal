import router from '@adonisjs/core/services/router'

const named = router.named({
  inventory_auth: () => import('#modules/inventory/middleware/auth_middleware'),
  inventory_permission: () => import('#modules/inventory/middleware/permission_middleware'),
  inventory_serviceApiKey: () => import('#modules/inventory/middleware/service_api_key_middleware'),
  inventory_rateLimit: () => import('#modules/inventory/middleware/rate_limit_middleware'),
  inventory_idempotency: () => import('#modules/inventory/middleware/idempotency_middleware'),
})

export const mw = {
  auth: named.inventory_auth,
  permission: named.inventory_permission,
  serviceApiKey: named.inventory_serviceApiKey,
  rateLimit: named.inventory_rateLimit,
  idempotency: named.inventory_idempotency,
}
