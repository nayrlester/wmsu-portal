import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import { t } from '#modules/inventory/helpers/db_schema'

export default class InternalClearanceController {
  async checkClearance({ params, response }: HttpContext) {
    const studentNumber = params.studentNumber

    const assignments = await db
      .from(t('asset_assignments'))
      .where('custodian_external_id', studentNumber)
      .whereNull('returned_at')
      .count('* as open_count')
      .first()

    const openItems = Number(assignments?.open_count ?? 0)
    const cleared = openItems === 0

    return response.ok({
      data: {
        cleared,
        openItems,
      },
    })
  }
}
