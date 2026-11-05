import router from '@adonisjs/core/services/router'

const named = router.named({
  library_tenant: () => import('#modules/library/middleware/tenant_resolver_middleware'),
  library_jwt: () => import('#modules/library/middleware/jwt_auth_middleware'),
  library_kiosk: () => import('#modules/library/middleware/kiosk_device_middleware'),
  library_serviceApiKey: () => import('#modules/library/middleware/service_api_key_middleware'),
})

export const mw = {
  tenant: named.library_tenant,
  jwt: named.library_jwt,
  kiosk: named.library_kiosk,
  serviceApiKey: named.library_serviceApiKey,
}
