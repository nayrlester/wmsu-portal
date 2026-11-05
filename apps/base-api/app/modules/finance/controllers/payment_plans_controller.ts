import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import { paymentPlanService, PaymentPlanTemplateError } from '#modules/finance/services/ufms/payment_plan_service'

const templateValidator = vine.compile(
  vine.object({
    code: vine.string().trim().minLength(2).maxLength(64),
    name: vine.string().trim().minLength(2).maxLength(255),
    planType: vine.enum(['exam_period', 'monthly'] as const),
    programId: vine.string().uuid().optional(),
    yearLevel: vine.number().min(1).max(10).optional(),
    classification: vine.string().trim().maxLength(40).optional(),
    downpaymentPercent: vine.number().min(0).max(100).optional(),
    monthlyCount: vine.number().min(1).max(12).optional(),
    installments: vine
      .array(
        vine.object({
          label: vine.string().trim().minLength(1).maxLength(120),
          percent: vine.number().min(0).max(100).optional(),
          amount: vine.number().min(0).optional(),
          dueDate: vine.string().optional(),
        })
      )
      .optional(),
    isActive: vine.boolean().optional(),
  })
)

export default class PaymentPlansController {
  async list({ response, auth }: HttpContext) {
    const user = auth.user!
    const data = await paymentPlanService.listTemplates(user.organizationId)
    return response.ok({ data })
  }

  async upsert({ request, response, auth }: HttpContext) {
    const user = auth.user!
    const payload = await request.validateUsing(templateValidator)
    const row = await paymentPlanService.upsertTemplate({
      organizationId: user.organizationId,
      code: payload.code,
      name: payload.name,
      planType: payload.planType,
      programId: payload.programId ?? null,
      yearLevel: payload.yearLevel ?? null,
      classification: payload.classification ?? null,
      downpaymentPercent: payload.downpaymentPercent ?? null,
      monthlyCount: payload.monthlyCount ?? null,
      installments: payload.installments ?? [],
      isActive: payload.isActive ?? true,
    })
    return response.created({ data: row })
  }

  async update({ params, request, response, auth }: HttpContext) {
    const user = auth.user!
    const payload = await request.validateUsing(templateValidator)
    try {
      const row = await paymentPlanService.updateTemplate({
        organizationId: user.organizationId,
        templateId: params.id,
        code: payload.code,
        name: payload.name,
        planType: payload.planType,
        programId: payload.programId ?? null,
        yearLevel: payload.yearLevel ?? null,
        classification: payload.classification ?? null,
        downpaymentPercent: payload.downpaymentPercent ?? null,
        monthlyCount: payload.monthlyCount ?? null,
        installments: payload.installments ?? [],
        isActive: payload.isActive ?? true,
      })
      return response.ok({ data: row })
    } catch (err) {
      if (err instanceof PaymentPlanTemplateError && err.code === 'PAYMENT_PLAN_CODE_TAKEN') {
        return response.conflict({ error: err.message, code: err.code })
      }
      if (err instanceof PaymentPlanTemplateError && err.code === 'PAYMENT_PLAN_NOT_FOUND') {
        return response.notFound({ error: err.message, code: err.code })
      }
      throw err
    }
  }

  async deactivate({ params, response, auth }: HttpContext) {
    const user = auth.user!
    try {
      const row = await paymentPlanService.deactivateTemplate(user.organizationId, params.id)
      return response.ok({ data: row })
    } catch (err) {
      if (err instanceof PaymentPlanTemplateError && err.code === 'PAYMENT_PLAN_NOT_FOUND') {
        return response.notFound({ error: err.message, code: err.code })
      }
      throw err
    }
  }
}
