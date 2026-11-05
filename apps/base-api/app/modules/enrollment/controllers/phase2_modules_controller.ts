import type { HttpContext } from '@adonisjs/core/http'
import { TOR_PHASE2_MODULES } from '#modules/enrollment/domain/tor_phase2_modules'

export default class Phase2ModulesController {
  async index({ response }: HttpContext) {
    return response.ok({
      data: TOR_PHASE2_MODULES.map((m) => ({
        ...m,
        status: 'active',
        apiPath: `/api/v1/phase2/${m.code}`,
      })),
    })
  }
}
