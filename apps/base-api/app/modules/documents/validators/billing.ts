import vine from '@vinejs/vine'
import { BillingCycle, BillingProvider, PlanSlug } from '#modules/documents/domain/enums/index'

export const checkoutValidator = vine.compile(
  vine.object({
    planSlug: vine.enum(Object.values(PlanSlug)),
    billingCycle: vine.enum(Object.values(BillingCycle)),
    couponCode: vine.string().trim().optional(),
    provider: vine.enum(Object.values(BillingProvider)).optional(),
  })
)

export const changePlanValidator = vine.compile(
  vine.object({
    planSlug: vine.enum(Object.values(PlanSlug)),
    billingCycle: vine.enum(Object.values(BillingCycle)).optional(),
  })
)

export const downgradePlanValidator = vine.compile(
  vine.object({
    planSlug: vine.enum(Object.values(PlanSlug)),
    billingCycle: vine.enum(Object.values(BillingCycle)).optional(),
    immediate: vine.boolean().optional(),
  })
)

export const cancelSubscriptionValidator = vine.compile(
  vine.object({
    atPeriodEnd: vine.boolean().optional(),
  })
)

export const validateCouponValidator = vine.compile(
  vine.object({
    code: vine.string().trim().minLength(2).maxLength(50),
  })
)
