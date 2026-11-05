import router from '@adonisjs/core/services/router'

const AiController = () => import('#modules/library/controllers/ai_controller')

export function registerAiRoutes() {
  router.post('ai/chat', [AiController, 'chat'])
  router.get('ai/quick-actions', [AiController, 'quickActions'])
  router.get('ai/conversations', [AiController, 'conversations'])
  router.get('ai/conversations/:id', [AiController, 'showConversation'])
  router.delete('ai/conversations/:id', [AiController, 'destroyConversation'])
}
