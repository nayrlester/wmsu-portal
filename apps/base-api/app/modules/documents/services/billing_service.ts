import { DateTime } from 'luxon'
import Plan from '#modules/documents/models/plan'
import Subscription from '#modules/documents/models/subscription'
import Tenant from '#modules/documents/models/tenant'
import User from '#modules/documents/models/user'
import Payment from '#modules/documents/models/payment'
import env from '#start/env'
import {
  BillingCycle,
  BillingProvider,
  PaymentStatus,
  PlanSlug,
  SubscriptionStatus,
  TenantStatus,
} from '#modules/documents/domain/enums/index'
import { PLAN_RANK } from '#modules/documents/domain/billing/billing_types'
import {
  BillingOperationException,
  BillingNotConfiguredException,
} from '#modules/documents/domain/exceptions/billing_exceptions'
import { getBillingProvider, resolveProviderName } from '#infrastructure/billing/provider_registry'
import { billingRepository } from '#infrastructure/repositories/billing_repository'
import { couponService, planPricingService } from '#modules/documents/services/coupon_service'
import { invoiceService } from '#modules/documents/services/invoice_service'
import { subscriptionService } from '#modules/documents/services/subscription_service'

export interface CheckoutInput {
  tenantId: string
  userId: string
  planSlug: PlanSlug
  billingCycle: BillingCycle
  couponCode?: string
  provider?: BillingProvider
}

export class BillingService {
  async listPlans() {
    const plans = await Plan.query().where('is_active', true).orderBy('sort_order', 'asc').orderBy('monthly_price', 'asc')
    return plans.map((plan) => ({
      id: plan.id,
      name: plan.name,
      slug: plan.slug,
      description: plan.description,
      monthlyPrice: Number(plan.monthlyPrice),
      annualPrice: Number(plan.annualPrice),
      currency: plan.currency,
      maxUsers: plan.maxUsers,
      maxDocuments: plan.maxDocuments,
      maxStorageBytes: plan.maxStorageBytes,
      features: plan.features,
    }))
  }

  async createCheckout(input: CheckoutInput) {
    const [tenant, user, plan] = await Promise.all([
      Tenant.findOrFail(input.tenantId),
      User.findOrFail(input.userId),
      Plan.query().where('slug', input.planSlug).where('is_active', true).firstOrFail(),
    ])

    const provider = getBillingProvider(input.provider)
    if (!provider.isConfigured()) {
      throw new BillingNotConfiguredException()
    }

    const providerName = resolveProviderName(provider)
    let coupon = null
    if (input.couponCode) {
      coupon = await couponService.validate(input.couponCode)
    }

    const baseAmount = planPricingService.resolvePrice(plan, input.billingCycle)
    const finalAmount = coupon ? couponService.applyDiscount(baseAmount, coupon) : baseAmount

    const customerId = await provider.ensureCustomer({
      tenantId: tenant.id,
      email: user.email,
      name: tenant.name,
      existingCustomerId: (await billingRepository.findCustomer(tenant.id, providerName))?.providerCustomerId,
    })

    await billingRepository.upsertCustomer({
      tenantId: tenant.id,
      provider: providerName,
      providerCustomerId: customerId,
      billingEmail: user.email,
    })

    const frontendUrl = env.get('FRONTEND_URL')
    const metadata: Record<string, string> = {
      tenantId: tenant.id,
      planSlug: plan.slug,
      billingCycle: input.billingCycle,
      userId: user.id,
    }

    if (coupon) {
      metadata.couponId = coupon.id
      metadata.couponCode = coupon.code
    }

    const subscription = await subscriptionService.getActiveSubscription(tenant.id)
    if (subscription?.status === SubscriptionStatus.TRIALING && subscription.trialEndsAt) {
      const daysLeft = Math.max(0, Math.ceil(subscription.trialEndsAt.diff(DateTime.now(), 'days').days))
      if (daysLeft > 0) {
        metadata.trialDays = String(daysLeft)
      }
    }

    const session = await provider.createCheckoutSession(
      {
        tenantId: tenant.id,
        tenantSlug: tenant.slug,
        tenantName: tenant.name,
        customerEmail: user.email,
        planSlug: plan.slug,
        planName: plan.name,
        billingCycle: input.billingCycle,
        amountCents: planPricingService.toCents(finalAmount),
        currency: plan.currency,
        providerPriceId: planPricingService.resolveProviderPriceId(plan, input.billingCycle, providerName),
        couponCode: coupon?.code,
        successUrl: `${frontendUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${frontendUrl}/billing/cancel`,
        metadata,
      },
      customerId
    )

    return {
      ...session,
      plan: { slug: plan.slug, name: plan.name },
      amount: finalAmount,
      currency: plan.currency,
    }
  }

  async upgrade(tenantId: string, planSlug: PlanSlug, billingCycle?: BillingCycle) {
    const [subscription, targetPlan] = await Promise.all([
      subscriptionService.getActiveSubscription(tenantId),
      Plan.query().where('slug', planSlug).where('is_active', true).firstOrFail(),
    ])

    if (!subscription) {
      throw new BillingOperationException('No active subscription to upgrade')
    }

    await subscription.load('plan')
    const currentRank = PLAN_RANK[subscription.plan.slug] ?? 0
    const targetRank = PLAN_RANK[targetPlan.slug] ?? 0

    if (targetRank <= currentRank) {
      throw new BillingOperationException('Target plan must be higher than the current plan')
    }

    const cycle = billingCycle ?? (subscription.billingCycle as BillingCycle)
    const providerName = (subscription.billingProvider as BillingProvider) ?? BillingProvider.STUB
    const provider = getBillingProvider(providerName)

    if (subscription.stripeSubscriptionId && providerName === BillingProvider.STRIPE) {
      const priceId = planPricingService.resolveProviderPriceId(targetPlan, cycle, providerName)
      if (!priceId) {
        throw new BillingNotConfiguredException('Stripe price ID missing for target plan')
      }

      await provider.updateSubscription({
        providerSubscriptionId: subscription.stripeSubscriptionId,
        planPriceId: priceId,
        prorationBehavior: 'create_prorations',
      })
    }

    subscription.planId = targetPlan.id
    subscription.billingCycle = cycle
    subscription.pendingPlanId = null
    subscription.pendingBillingCycle = null
    subscription.status = SubscriptionStatus.ACTIVE
    await subscription.save()

    await Tenant.query().where('id', tenantId).update({
      plan_tier: targetPlan.slug,
      status: TenantStatus.ACTIVE,
    })

    await subscription.load('plan')
    return subscriptionService.serializeSubscription(subscription)
  }

  async downgrade(tenantId: string, planSlug: PlanSlug, billingCycle?: BillingCycle, immediate = false) {
    const [subscription, targetPlan] = await Promise.all([
      subscriptionService.getActiveSubscription(tenantId),
      Plan.query().where('slug', planSlug).where('is_active', true).firstOrFail(),
    ])

    if (!subscription) {
      throw new BillingOperationException('No active subscription to downgrade')
    }

    await subscription.load('plan')
    const currentRank = PLAN_RANK[subscription.plan.slug] ?? 0
    const targetRank = PLAN_RANK[targetPlan.slug] ?? 0

    if (targetRank >= currentRank) {
      throw new BillingOperationException('Target plan must be lower than the current plan')
    }

    const cycle = billingCycle ?? (subscription.billingCycle as BillingCycle)

    if (immediate) {
      subscription.planId = targetPlan.id
      subscription.billingCycle = cycle
      subscription.pendingPlanId = null
      subscription.pendingBillingCycle = null
      await subscription.save()

      await Tenant.query().where('id', tenantId).update({ plan_tier: targetPlan.slug })
    } else {
      subscription.pendingPlanId = targetPlan.id
      subscription.pendingBillingCycle = cycle
      await subscription.save()
    }

    await subscription.load('plan')
    return {
      ...subscriptionService.serializeSubscription(subscription),
      pendingPlan: {
        slug: targetPlan.slug,
        name: targetPlan.name,
        effectiveAt: immediate ? DateTime.now().toISO() : subscription.currentPeriodEnd?.toISO(),
      },
    }
  }

  async cancel(tenantId: string, atPeriodEnd = true) {
    const subscription = await subscriptionService.getActiveSubscription(tenantId)
    if (!subscription) {
      throw new BillingOperationException('No active subscription to cancel')
    }

    const providerName = (subscription.billingProvider as BillingProvider) ?? BillingProvider.STUB
    const provider = getBillingProvider(providerName)

    if (subscription.stripeSubscriptionId) {
      await provider.cancelSubscription(subscription.stripeSubscriptionId, atPeriodEnd)
    }

    if (atPeriodEnd) {
      subscription.cancelledAt = DateTime.now()
      await subscription.save()
    } else {
      subscription.status = SubscriptionStatus.CANCELLED
      subscription.cancelledAt = DateTime.now()
      await subscription.save()

      await Tenant.query().where('id', tenantId).update({
        status: TenantStatus.CANCELLED,
      })
    }

    await subscription.load('plan')
    return subscriptionService.serializeSubscription(subscription)
  }

  async activateFromCheckout(metadata: Record<string, string>, provider: BillingProvider, providerSubscriptionId: string) {
    const tenantId = metadata.tenantId
    const planSlug = metadata.planSlug as PlanSlug
    const billingCycle = (metadata.billingCycle ?? BillingCycle.MONTHLY) as BillingCycle

    const plan = await Plan.query().where('slug', planSlug).firstOrFail()
    let subscription = await subscriptionService.getActiveSubscription(tenantId)

    if (subscription) {
      subscription.merge({
        planId: plan.id,
        status: SubscriptionStatus.ACTIVE,
        billingCycle,
        billingProvider: provider,
        stripeSubscriptionId: provider === BillingProvider.STRIPE ? providerSubscriptionId : subscription.stripeSubscriptionId,
        paymongoSubscriptionId:
          provider === BillingProvider.PAYMONGO ? providerSubscriptionId : subscription.paymongoSubscriptionId,
        couponId: metadata.couponId ?? subscription.couponId,
        trialEndsAt: null,
        currentPeriodStart: DateTime.now(),
        currentPeriodEnd:
          billingCycle === BillingCycle.ANNUAL
            ? DateTime.now().plus({ years: 1 })
            : DateTime.now().plus({ months: 1 }),
        cancelledAt: null,
        pendingPlanId: null,
        pendingBillingCycle: null,
      })
      await subscription.save()
    } else {
      subscription = await Subscription.create({
        tenantId,
        planId: plan.id,
        status: SubscriptionStatus.ACTIVE,
        billingCycle,
        billingProvider: provider,
        stripeSubscriptionId: provider === BillingProvider.STRIPE ? providerSubscriptionId : null,
        paymongoSubscriptionId: provider === BillingProvider.PAYMONGO ? providerSubscriptionId : null,
        couponId: metadata.couponId ?? null,
        currentPeriodStart: DateTime.now(),
        currentPeriodEnd:
          billingCycle === BillingCycle.ANNUAL
            ? DateTime.now().plus({ years: 1 })
            : DateTime.now().plus({ months: 1 }),
      })
    }

    if (metadata.couponId) {
      await couponService.redeem(metadata.couponId)
    }

    await Tenant.query().where('id', tenantId).update({
      plan_tier: plan.slug,
      status: TenantStatus.ACTIVE,
      trial_ends_at: null,
    })

    const amount = planPricingService.resolvePrice(plan, billingCycle)
    await invoiceService.createManualInvoice({
      tenantId,
      subscriptionId: subscription.id,
      amount,
      currency: plan.currency,
      lineItems: [{ description: `${plan.name} (${billingCycle})`, amount, quantity: 1 }],
      couponId: metadata.couponId ?? null,
    })

    await Payment.create({
      tenantId,
      subscriptionId: subscription.id,
      amount,
      currency: plan.currency,
      status: PaymentStatus.SUCCEEDED,
      provider,
      providerPaymentId: providerSubscriptionId,
      paidAt: DateTime.now(),
      metadata: { source: 'checkout' },
    })

    await subscription.load('plan')
    return subscription
  }

  async applyPendingDowngrades() {
    const due = await Subscription.query()
      .whereNotNull('pending_plan_id')
      .whereNotNull('current_period_end')
      .where('current_period_end', '<=', DateTime.now().toSQL())
      .whereNull('deleted_at')

    for (const subscription of due) {
      if (!subscription.pendingPlanId) continue

      subscription.planId = subscription.pendingPlanId
      if (subscription.pendingBillingCycle) {
        subscription.billingCycle = subscription.pendingBillingCycle
      }

      subscription.pendingPlanId = null
      subscription.pendingBillingCycle = null
      await subscription.save()

      const plan = await Plan.findOrFail(subscription.planId)
      await Tenant.query().where('id', subscription.tenantId).update({ plan_tier: plan.slug })
    }

    return due.length
  }
}

export const billingService = new BillingService()
