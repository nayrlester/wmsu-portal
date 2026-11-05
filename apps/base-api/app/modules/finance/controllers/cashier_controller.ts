import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import { t } from '#modules/finance/helpers/db_schema'

export default class CashierController {
  async recordPayment({ request, response, auth }: HttpContext) {
    const user = auth.user!
    const payload = request.only(['studentNumber', 'amount', 'paymentType', 'reference', 'particulars'])

    const orNumber = `OR-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`

    const [receipt] = await db.table(t('official_receipts')).insert({
      organization_id: user.organizationId,
      or_number: orNumber,
      payer_name: payload.studentNumber,
      payer_type: 'student',
      payer_reference: payload.studentNumber,
      amount: payload.amount,
      particulars: payload.particulars,
      issued_at: new Date(),
      issued_by: user.id,
      created_at: new Date(),
    }).returning('*')

    const [payment] = await db.table(t('student_payments')).insert({
      organization_id: user.organizationId,
      student_number: payload.studentNumber,
      or_id: receipt.id,
      amount: payload.amount,
      payment_type: payload.paymentType ?? 'tuition',
      reference: payload.reference,
      paid_at: new Date(),
      received_by: user.id,
      created_at: new Date(),
    }).returning('*')

    return response.created({ data: { receipt, payment } })
  }

  async listPayments({ request, response, auth }: HttpContext) {
    const user = auth.user!
    const page = request.input('page', 1)
    const limit = request.input('limit', 20)
    const studentNumber = request.input('studentNumber')

    let query = db
      .from(t('student_payments'))
      .where('organization_id', user.organizationId)
      .orderBy('paid_at', 'desc')

    if (studentNumber) {
      query = query.where('student_number', studentNumber)
    }

    const payments = await query.paginate(page, limit)
    return response.ok({ data: payments })
  }
}
