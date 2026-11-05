import { DateTime } from 'luxon'
import Plan from '#modules/documents/models/plan'
import Subscription from '#modules/documents/models/subscription'
import Tenant from '#modules/documents/models/tenant'
import { PlanSlug, SubscriptionStatus, TenantStatus } from '#modules/documents/domain/enums/index'

export class SubscriptionService {
  async getActiveSubscription(tenantId: string): Promise<Subscription | null> {
    return Subscription.query()
      .where('tenant_id', tenantId)
      .whereIn('status', [SubscriptionStatus.TRIALING, SubscriptionStatus.ACTIVE])
      .whereNull('deleted_at')
      .preload('plan')
      .orderBy('created_at', 'desc')
      .first()
  }

  async getActivePlan(tenantId: string): Promise<Plan> {
    const subscription = await this.getActiveSubscription(tenantId)
    if (subscription?.plan) {
      return subscription.plan
    }

    const tenant = await Tenant.findOrFail(tenantId)
    const slug = tenant.planTier ?? PlanSlug.STARTER
    return Plan.query().where('slug', slug).where('is_active', true).firstOrFail()
  }

  async createTrialSubscription(tenantId: string, planSlug: PlanSlug = PlanSlug.STARTER): Promise<Subscription> {
    const plan = await Plan.query().where('slug', planSlug).where('is_active', true).firstOrFail()
    const trialEndsAt = DateTime.now().plus({ days: 14 })

    const subscription = await Subscription.create({
      tenantId,
      planId: plan.id,
      status: SubscriptionStatus.TRIALING,
      billingCycle: 'monthly',
      trialEndsAt,
      currentPeriodStart: DateTime.now(),
      currentPeriodEnd: trialEndsAt,
    })

    await Tenant.query().where('id', tenantId).update({
      plan_tier: plan.slug,
      status: TenantStatus.TRIALING,
      trial_ends_at: trialEndsAt.toSQL(),
    })

    await subscription.load('plan')
    return subscription
  }

  serializeSubscription(subscription: Subscription) {
    return {
      id: subscription.id,
      status: subscription.status,
      billingCycle: subscription.billingCycle,
      billingProvider: subscription.billingProvider,
      trialEndsAt: subscription.trialEndsAt,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelledAt: subscription.cancelledAt,
      pendingPlanId: subscription.pendingPlanId,
      pendingBillingCycle: subscription.pendingBillingCycle,
      plan: subscription.plan
        ? {
            id: subscription.plan.id,
            name: subscription.plan.name,
            slug: subscription.plan.slug,
            maxUsers: subscription.plan.maxUsers,
            maxDocuments: subscription.plan.maxDocuments,
            maxStorageBytes: subscription.plan.maxStorageBytes,
            features: subscription.plan.features,
          }
        : null,
    }
  }
}

export const subscriptionService = new SubscriptionService()
