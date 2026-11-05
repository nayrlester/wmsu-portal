import router from '@adonisjs/core/services/router'

const named = router.named({
  documents_auth: () => import('#modules/documents/middleware/auth_middleware'),
  documents_tenant: () => import('#modules/documents/middleware/tenant_middleware'),
  documents_permission: () => import('#modules/documents/middleware/permission_middleware'),
  documents_superAdmin: () => import('#modules/documents/middleware/super_admin_middleware'),
  documents_tenantAdmin: () => import('#modules/documents/middleware/tenant_admin_middleware'),
  documents_serviceApiKey: () => import('#modules/documents/middleware/service_api_key_middleware'),
})

export const mw = {
  auth: named.documents_auth,
  tenant: named.documents_tenant,
  permission: named.documents_permission,
  superAdmin: named.documents_superAdmin,
  tenantAdmin: named.documents_tenantAdmin,
  serviceApiKey: named.documents_serviceApiKey,
}
