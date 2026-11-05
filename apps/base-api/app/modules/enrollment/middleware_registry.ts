import router from '@adonisjs/core/services/router'

const named = router.named({
  enrollment_auth: () => import('#modules/enrollment/middleware/auth_middleware'),
  enrollment_permission: () => import('#modules/enrollment/middleware/permission_middleware'),
  enrollment_serviceApiKey: () => import('#modules/enrollment/middleware/service_api_key_middleware'),
  enrollment_rateLimit: () => import('#modules/enrollment/middleware/rate_limit_middleware'),
  enrollment_idempotency: () => import('#modules/enrollment/middleware/idempotency_middleware'),
})

export const mw = {
  auth: named.enrollment_auth,
  permission: named.enrollment_permission,
  serviceApiKey: named.enrollment_serviceApiKey,
  rateLimit: named.enrollment_rateLimit,
  idempotency: named.enrollment_idempotency,
}
