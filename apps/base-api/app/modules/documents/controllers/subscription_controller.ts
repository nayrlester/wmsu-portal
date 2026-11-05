import type { HttpContext } from '@adonisjs/core/http'
import { subscriptionService } from '#modules/documents/services/subscription_service'
import { planLimitService } from '#modules/documents/services/plan_limit_service'
import { tenantContext } from '#modules/documents/domain/tenant_context'

export default class SubscriptionController {
  async show({ response }: HttpContext) {
    const tenantId = tenantContext.requireTenantId()
    const subscription = await subscriptionService.getActiveSubscription(tenantId)

    if (!subscription) {
      const plan = await subscriptionService.getActivePlan(tenantId)
      return response.ok({
        subscription: null,
        plan: {
          name: plan.name,
          slug: plan.slug,
          maxUsers: plan.maxUsers,
          maxDocuments: plan.maxDocuments,
          maxStorageBytes: plan.maxStorageBytes,
          features: plan.features,
        },
      })
    }

    return response.ok({ subscription: subscriptionService.serializeSubscription(subscription) })
  }

  async usage({ response }: HttpContext) {
    const tenantId = tenantContext.requireTenantId()
    const data = await planLimitService.getUsageWithLimits(tenantId)
    return response.ok(data)
  }
}
