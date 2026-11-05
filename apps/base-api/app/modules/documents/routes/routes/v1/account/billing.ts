import router from '@adonisjs/core/services/router'
import { mw as middleware } from '#modules/documents/middleware_registry'

const SubscriptionController = () => import('#modules/documents/controllers/subscription_controller')
const BillingController = () => import('#modules/documents/controllers/billing_controller')

const billingManage = () => middleware.permission(['billing.manage'])

export function registerAccountBillingRoutes() {
  router.get('subscription', [SubscriptionController, 'show'])
  router.get('subscription/usage', [SubscriptionController, 'usage'])

  router.get('billing/plans', [BillingController, 'plans'])
  router.post('billing/checkout', [BillingController, 'checkout']).use(billingManage())
  router.post('billing/upgrade', [BillingController, 'upgrade']).use(billingManage())
  router.post('billing/downgrade', [BillingController, 'downgrade']).use(billingManage())
  router.post('billing/cancel', [BillingController, 'cancel']).use(billingManage())
  router.post('billing/coupons/validate', [BillingController, 'validateCoupon']).use(billingManage())
  router.get('billing/invoices', [BillingController, 'invoices']).use(billingManage())
  router.get('billing/invoices/:id', [BillingController, 'showInvoice']).use(billingManage())
  router.get('billing/invoices/:id/pdf', [BillingController, 'invoicePdf']).use(billingManage())
  router.get('billing/usage', [BillingController, 'usageReport']).use(billingManage())
  router.post('billing/usage/record', [BillingController, 'recordUsage']).use(billingManage())
}
