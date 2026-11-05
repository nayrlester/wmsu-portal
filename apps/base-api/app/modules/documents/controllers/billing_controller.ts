import type { HttpContext } from '@adonisjs/core/http'
import { tenantContext } from '#modules/documents/domain/tenant_context'
import { billingService } from '#modules/documents/services/billing_service'
import { couponService } from '#modules/documents/services/coupon_service'
import { invoiceService } from '#modules/documents/services/invoice_service'
import { usageTrackingService } from '#modules/documents/services/usage_tracking_service'
import {
  cancelSubscriptionValidator,
  changePlanValidator,
  checkoutValidator,
  downgradePlanValidator,
  validateCouponValidator,
} from '#modules/documents/validators/billing'

export default class BillingController {
  async plans({ response }: HttpContext) {
    const plans = await billingService.listPlans()
    return response.ok({ plans })
  }

  async checkout({ auth, request, response }: HttpContext) {
    const payload = await request.validateUsing(checkoutValidator)
    const tenantId = tenantContext.requireTenantId()
    const user = auth.user!

    const session = await billingService.createCheckout({
      tenantId,
      userId: user.id,
      planSlug: payload.planSlug,
      billingCycle: payload.billingCycle,
      couponCode: payload.couponCode,
      provider: payload.provider,
    })

    return response.ok(session)
  }

  async upgrade({ request, response }: HttpContext) {
    const payload = await request.validateUsing(changePlanValidator)
    const tenantId = tenantContext.requireTenantId()

    const subscription = await billingService.upgrade(
      tenantId,
      payload.planSlug,
      payload.billingCycle
    )

    return response.ok({ subscription })
  }

  async downgrade({ request, response }: HttpContext) {
    const payload = await request.validateUsing(downgradePlanValidator)
    const tenantId = tenantContext.requireTenantId()

    const result = await billingService.downgrade(
      tenantId,
      payload.planSlug,
      payload.billingCycle,
      payload.immediate ?? false
    )

    return response.ok(result)
  }

  async cancel({ request, response }: HttpContext) {
    const payload = await request.validateUsing(cancelSubscriptionValidator)
    const tenantId = tenantContext.requireTenantId()

    const subscription = await billingService.cancel(tenantId, payload.atPeriodEnd ?? true)
    return response.ok({ subscription })
  }

  async validateCoupon({ request, response }: HttpContext) {
    const payload = await request.validateUsing(validateCouponValidator)
    const coupon = await couponService.validate(payload.code)
    return response.ok({ coupon: couponService.serialize(coupon) })
  }

  async invoices({ request, response }: HttpContext) {
    const tenantId = tenantContext.requireTenantId()
    const page = Number(request.input('page', 1))
    const limit = Number(request.input('limit', 20))

    const paginator = await invoiceService.listForTenant(tenantId, page, limit)
    return response.ok({
      data: paginator.all().map((invoice) => invoiceService.serialize(invoice)),
      meta: paginator.getMeta(),
    })
  }

  async showInvoice({ params, response }: HttpContext) {
    const tenantId = tenantContext.requireTenantId()
    const invoice = await invoiceService.getForTenant(tenantId, params.id)

    if (!invoice) {
      return response.notFound({ error: 'Invoice not found' })
    }

    return response.ok({ invoice: invoiceService.serialize(invoice) })
  }

  async invoicePdf({ params, response }: HttpContext) {
    const tenantId = tenantContext.requireTenantId()
    const invoice = await invoiceService.getForTenant(tenantId, params.id)

    if (!invoice) {
      return response.notFound({ error: 'Invoice not found' })
    }

    if (invoice.pdfUrl) {
      return response.redirect(invoice.pdfUrl)
    }

    return response.ok({ document: invoiceService.buildPdfPayload(invoice) })
  }

  async usageReport({ response }: HttpContext) {
    const tenantId = tenantContext.requireTenantId()
    const report = await usageTrackingService.getUsageReport(tenantId)
    return response.ok(report)
  }

  async recordUsage({ response }: HttpContext) {
    const tenantId = tenantContext.requireTenantId()
    const metrics = await usageTrackingService.recordSnapshot(tenantId)
    return response.ok({ metrics, recordedAt: new Date().toISOString() })
  }
}
