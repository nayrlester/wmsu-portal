import type { HttpContext } from '@adonisjs/core/http'
import { ok } from '#modules/finance/helpers/api_envelope'
import { UFMS_PERMISSIONS } from '#modules/finance/domain/ufms_permissions'

export default class UfmsController {
  async info({ response }: HttpContext) {
    return response.ok(
      ok(
        {
          system: 'UFMS',
          name: 'University Finance Management System',
          package: 'A',
          stage: 'foundation',
          torIdsInScope: ['FIN-006', 'FIN-008', 'FIN-022', 'FIN-023', 'FIN-025', 'FIN-032', 'FIN-033'],
          permissions: UFMS_PERMISSIONS.map((p) => p.code),
        },
        'UFMS foundation'
      )
    )
  }
}
