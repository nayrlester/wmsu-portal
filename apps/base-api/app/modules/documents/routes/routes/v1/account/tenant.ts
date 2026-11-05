import router from '@adonisjs/core/services/router'
import { mw as middleware } from '#modules/documents/middleware_registry'

const OrganizationController = () => import('#modules/documents/controllers/organization_controller')
const TenantSettingsController = () => import('#modules/documents/controllers/tenant_settings_controller')
const TenantBrandingController = () => import('#modules/documents/controllers/tenant_branding_controller')
const TenantDomainsController = () => import('#modules/documents/controllers/tenant_domains_controller')

const settingsManage = () => middleware.permission(['settings.manage'])

export function registerAccountTenantRoutes() {
  router.get('organization', [OrganizationController, 'show'])
  router.put('organization', [OrganizationController, 'update']).use(settingsManage())

  router.get('settings', [TenantSettingsController, 'show']).use(settingsManage())
  router.put('settings', [TenantSettingsController, 'update']).use(settingsManage())

  router.get('branding', [TenantBrandingController, 'show']).use(settingsManage())
  router.put('branding', [TenantBrandingController, 'update']).use(settingsManage())
  router.post('branding/logo', [TenantBrandingController, 'uploadLogo']).use(settingsManage())

  router.get('domains', [TenantDomainsController, 'index']).use(settingsManage())
  router.post('domains', [TenantDomainsController, 'store']).use(settingsManage())
  router.post('domains/verify', [TenantDomainsController, 'verify']).use(settingsManage())
  router.post('domains/:id/primary', [TenantDomainsController, 'setPrimary']).use(settingsManage())
  router.delete('domains/:id', [TenantDomainsController, 'destroy']).use(settingsManage())
}
