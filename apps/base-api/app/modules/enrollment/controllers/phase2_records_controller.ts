import type { HttpContext } from '@adonisjs/core/http'
import Phase2Record from '#modules/enrollment/models/phase2_record'
import { TOR_PHASE2_MODULES } from '#modules/enrollment/domain/tor_phase2_modules'

const VALID_CODES = new Set(TOR_PHASE2_MODULES.map((m) => m.code))

export default class Phase2RecordsController {
  async index({ params, request, response, auth }: HttpContext) {
    const user = auth.user!
    const moduleCode = String(params.moduleCode).toUpperCase()
    if (!VALID_CODES.has(moduleCode as (typeof TOR_PHASE2_MODULES)[number]['code'])) {
      return response.notFound({ error: 'Unknown phase2 module' })
    }
    const rows = await Phase2Record.query()
      .where('organization_id', user.organizationId)
      .where('module_code', moduleCode)
      .orderBy('created_at', 'desc')
      .paginate(request.input('page', 1), request.input('limit', 50))
    return response.ok({ data: rows })
  }

  async store({ params, request, response, auth }: HttpContext) {
    const user = auth.user!
    const moduleCode = String(params.moduleCode).toUpperCase()
    if (!VALID_CODES.has(moduleCode as (typeof TOR_PHASE2_MODULES)[number]['code'])) {
      return response.notFound({ error: 'Unknown phase2 module' })
    }
    const body = request.only(['referenceKey', 'title', 'payload', 'status'])
    const row = await Phase2Record.updateOrCreate(
      {
        organizationId: user.organizationId,
        moduleCode,
        referenceKey: String(body.referenceKey),
      },
      {
        title: String(body.title ?? body.referenceKey),
        payload: (body.payload as Record<string, unknown>) ?? {},
        status: String(body.status ?? 'active'),
      }
    )
    return response.created({ data: row })
  }
}
