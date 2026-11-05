import router from '@adonisjs/core/services/router'

const BillingWebhooksController = () => import('#modules/documents/controllers/billing_webhooks_controller')

export function registerBillingWebhookRoutes() {
  router
    .group(() => {
      router.post('stripe', [BillingWebhooksController, 'stripe']).as('documents.webhooks.billing.stripe')
      router.post('paymongo', [BillingWebhooksController, 'paymongo']).as('documents.webhooks.billing.paymongo')
      router.post('stub', [BillingWebhooksController, 'stub']).as('documents.webhooks.billing.stub')
    })
    .prefix('/api/v1/documents/webhooks/billing')
}
