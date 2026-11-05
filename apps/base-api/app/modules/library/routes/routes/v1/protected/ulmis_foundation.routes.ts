import router from '@adonisjs/core/services/router'

const UlmisFoundationController = () => import('#modules/library/controllers/ulmis_foundation_controller')

export function registerUlmisFoundationRoutes() {
  router.get('ulmis/foundation/status', [UlmisFoundationController, 'status'])
  router.get('ulmis/settings', [UlmisFoundationController, 'listSettings'])
  router.put('ulmis/settings', [UlmisFoundationController, 'upsertSetting'])
  router.get('ulmis/integrations/contracts', [UlmisFoundationController, 'listContracts'])
  router.get('ulmis/integrations/outbox', [UlmisFoundationController, 'listOutbox'])
}
