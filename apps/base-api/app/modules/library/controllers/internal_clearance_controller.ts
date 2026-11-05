import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import { t } from '#modules/library/helpers/db_schema'

export default class InternalClearanceController {
  async checkClearance({ params, response }: HttpContext) {
    const studentNumber = params.studentNumber

    const member = await db
      .from(t('members'))
      .where('external_id', studentNumber)
      .first()

    if (!member) {
      return response.ok({
        data: {
          cleared: true,
          openItems: 0,
        },
      })
    }

    const loans = await db
      .from(t('loans'))
      .where('member_id', member.id)
      .where('status', 'borrowed')
      .count('* as open_count')
      .first()

    const openItems = Number(loans?.open_count ?? 0)
    const cleared = openItems === 0

    return response.ok({
      data: {
        cleared,
        openItems,
      },
    })
  }
}
