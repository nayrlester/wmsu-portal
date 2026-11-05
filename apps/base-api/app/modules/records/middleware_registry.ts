import router from '@adonisjs/core/services/router'

const named = router.named({
  records_auth: () => import('#modules/records/middleware/auth_middleware'),
  records_permission: () => import('#modules/records/middleware/permission_middleware'),
  records_serviceApiKey: () => import('#modules/records/middleware/service_api_key_middleware'),
  records_rateLimit: () => import('#modules/records/middleware/rate_limit_middleware'),
  records_idempotency: () => import('#modules/records/middleware/idempotency_middleware'),
})

export const mw = {
  auth: named.records_auth,
  permission: named.records_permission,
  serviceApiKey: named.records_serviceApiKey,
  rateLimit: named.records_rateLimit,
  idempotency: named.records_idempotency,
}
