import router from '@adonisjs/core/services/router'

const PandadocWebhooksController = () => import('#modules/documents/controllers/pandadoc_webhooks_controller')

export function registerPandadocWebhookRoutes() {
  router
    .post('/api/v1/documents/webhooks/pandadoc', [PandadocWebhooksController, 'handle'])
    .as('documents.webhooks.pandadoc')
}
