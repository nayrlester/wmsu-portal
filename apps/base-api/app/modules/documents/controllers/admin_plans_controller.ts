import type { HttpContext } from '@adonisjs/core/http'
import { adminPlanService } from '#modules/documents/services/admin_plan_service'
import { createAdminPlanValidator, updateAdminPlanValidator } from '#modules/documents/validators/admin'

export default class AdminPlansController {
  async index({ request, response }: HttpContext) {
    const includeInactive = request.input('includeInactive', 'true') !== 'false'
    const plans = await adminPlanService.list(includeInactive)
    return response.ok({ plans })
  }

  async show({ params, response }: HttpContext) {
    const plan = await adminPlanService.findById(params.id)
    return response.ok({ plan })
  }

  async store({ request, auth, response }: HttpContext) {
    const payload = await request.validateUsing(createAdminPlanValidator)
    const plan = await adminPlanService.create(payload, auth.user!.id)
    return response.created({ plan })
  }

  async update({ params, request, auth, response }: HttpContext) {
    const payload = await request.validateUsing(updateAdminPlanValidator)
    const plan = await adminPlanService.update(params.id, payload, auth.user!.id)
    return response.ok({ plan })
  }
}
