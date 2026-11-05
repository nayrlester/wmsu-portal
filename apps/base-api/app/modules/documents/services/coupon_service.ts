import { DateTime } from 'luxon'
import Coupon from '#modules/documents/models/coupon'
import Plan from '#modules/documents/models/plan'
import { CouponDiscountType } from '#modules/documents/domain/enums/index'
import { InvalidCouponException } from '#modules/documents/domain/exceptions/billing_exceptions'
import { billingRepository } from '#infrastructure/repositories/billing_repository'

export class CouponService {
  async validate(code: string): Promise<Coupon> {
    const coupon = await billingRepository.findCouponByCode(code)
    if (!coupon || !coupon.isActive) {
      throw new InvalidCouponException()
    }

    if (coupon.expiresAt && coupon.expiresAt < DateTime.now()) {
      throw new InvalidCouponException('Coupon has expired')
    }

    if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
      throw new InvalidCouponException('Coupon usage limit reached')
    }

    return coupon
  }

  applyDiscount(amount: number, coupon: Coupon): number {
    if (coupon.discountType === CouponDiscountType.PERCENT) {
      const discount = amount * (Number(coupon.discountValue) / 100)
      return Math.max(0, amount - discount)
    }

    return Math.max(0, amount - Number(coupon.discountValue))
  }

  async redeem(couponId: string): Promise<void> {
    const coupon = await Coupon.findOrFail(couponId)
    coupon.usedCount += 1
    await coupon.save()
  }

  serialize(coupon: Coupon) {
    return {
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: Number(coupon.discountValue),
      expiresAt: coupon.expiresAt,
    }
  }
}

export class PlanPricingService {
  resolvePrice(plan: Plan, billingCycle: string): number {
    return billingCycle === 'annual' ? Number(plan.annualPrice) : Number(plan.monthlyPrice)
  }

  resolveProviderPriceId(plan: Plan, billingCycle: string, provider: string): string | null {
    if (provider === 'stripe') {
      return billingCycle === 'annual' ? plan.stripePriceIdAnnual : plan.stripePriceIdMonthly
    }

    if (provider === 'paymongo') {
      return billingCycle === 'annual' ? plan.paymongoPlanIdAnnual : plan.paymongoPlanIdMonthly
    }

    return null
  }

  toCents(amount: number): number {
    return Math.round(amount * 100)
  }
}

export const couponService = new CouponService()
export const planPricingService = new PlanPricingService()
