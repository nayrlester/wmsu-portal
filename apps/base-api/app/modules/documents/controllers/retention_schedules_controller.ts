import type { HttpContext } from '@adonisjs/core/http'
import { retentionScheduleService } from '#modules/documents/services/retention_schedule_service'
import {
  createRetentionScheduleValidator,
  updateRetentionScheduleValidator,
} from '#modules/documents/validators/retention_schedule'

export default class RetentionSchedulesController {
  async index({ response }: HttpContext) {
    const schedules = await retentionScheduleService.list()
    return response.ok({
      schedules: schedules.map((s) => retentionScheduleService.serialize(s)),
    })
  }

  async store({ request, response }: HttpContext) {
    const payload = await request.validateUsing(createRetentionScheduleValidator)
    const schedule = await retentionScheduleService.create(payload)
    return response.created({ schedule: retentionScheduleService.serialize(schedule) })
  }

  async update({ params, request, response }: HttpContext) {
    const payload = await request.validateUsing(updateRetentionScheduleValidator)
    const schedule = await retentionScheduleService.update(params.id, payload)
    return response.ok({ schedule: retentionScheduleService.serialize(schedule) })
  }

  async destroy({ params, response }: HttpContext) {
    await retentionScheduleService.destroy(params.id)
    return response.ok({ message: 'Retention schedule deleted' })
  }

  async applyAgencyPacks({ request, response }: HttpContext) {
    const { tenantContext } = await import('#modules/documents/domain/tenant_context')
    const tenantId = tenantContext.requireTenantId()
    const raw = request.input('packs') as string[] | string | undefined
    const packs = Array.isArray(raw)
      ? raw.filter((p): p is 'coa' | 'ched' => p === 'coa' || p === 'ched')
      : typeof raw === 'string'
        ? raw.split(',').map((p) => p.trim()).filter((p): p is 'coa' | 'ched' => p === 'coa' || p === 'ched')
        : (['coa', 'ched'] as Array<'coa' | 'ched'>)

    const upserted = await retentionScheduleService.ensureAgencyPacks(tenantId, packs)
    const schedules = await retentionScheduleService.list()
    return response.ok({
      upserted,
      packs,
      schedules: schedules.map((s) => retentionScheduleService.serialize(s)),
    })
  }
}
