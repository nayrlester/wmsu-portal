import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import { t } from '#modules/finance/helpers/db_schema'

export default class InternalClearanceController {
  async checkClearance({ params, response }: HttpContext) {
    const studentNumber = params.studentNumber

    const payments = await db
      .from(t('student_payments'))
      .where('student_number', studentNumber)
      .sum('amount as total_paid')
      .first()

    const totalPaid = Number(payments?.total_paid ?? 0)
    const balance = 0 - totalPaid
    const cleared = balance <= 0

    return response.ok({
      data: {
        cleared,
        balance,
        totalPaid,
        openItems: cleared ? 0 : 1,
      },
    })
  }
}
