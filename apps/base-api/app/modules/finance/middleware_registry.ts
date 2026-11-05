import router from '@adonisjs/core/services/router'

const named = router.named({
  finance_auth: () => import('#modules/finance/middleware/auth_middleware'),
  finance_permission: () => import('#modules/finance/middleware/permission_middleware'),
  finance_permission_any: () => import('#modules/finance/middleware/permission_any_middleware'),
  finance_serviceApiKey: () => import('#modules/finance/middleware/service_api_key_middleware'),
  finance_rateLimit: () => import('#modules/finance/middleware/rate_limit_middleware'),
  finance_idempotency: () => import('#modules/finance/middleware/idempotency_middleware'),
})

export const mw = {
  auth: named.finance_auth,
  permission: named.finance_permission,
  permissionAny: named.finance_permission_any,
  serviceApiKey: named.finance_serviceApiKey,
  rateLimit: named.finance_rateLimit,
  idempotency: named.finance_idempotency,
}
