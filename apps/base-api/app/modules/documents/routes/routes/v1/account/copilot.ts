import router from '@adonisjs/core/services/router'

const CopilotController = () => import('#modules/documents/controllers/copilot_controller')

export function registerAccountCopilotRoutes() {
  router.post('copilot/chat', [CopilotController, 'chat'])
  router.post('copilot/confirm', [CopilotController, 'confirm'])
  router.post('copilot/cancel', [CopilotController, 'cancel'])
}
