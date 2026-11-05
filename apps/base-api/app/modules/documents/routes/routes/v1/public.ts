import router from '@adonisjs/core/services/router'

const TenantBrandingController = () => import('#modules/documents/controllers/tenant_branding_controller')
const InternalFilesController = () => import('#modules/documents/controllers/internal_files_controller')
const BillingController = () => import('#modules/documents/controllers/billing_controller')

export function registerV1PublicRoutes() {
  router.get('public/branding', [TenantBrandingController, 'publicShow'])
  router.get('public/plans', [BillingController, 'plans']).as('public.plans')
  router.get('internal/files/download', [InternalFilesController, 'download'])
}
