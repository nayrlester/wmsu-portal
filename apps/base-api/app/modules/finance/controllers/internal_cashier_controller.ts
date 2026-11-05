import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import { t } from '#modules/finance/helpers/db_schema'

export default class InternalCashierController {
  async recordPayment({ request, response }: HttpContext) {
    const payload = request.only([
      'organizationId',
      'studentNumber',
      'amount',
      'paymentType',
      'reference',
      'particulars',
      'assessmentNumber',
    ])

    const organizationId = payload.organizationId as string
    const studentNumber = payload.studentNumber as string
    const amount = Number(payload.amount)

    if (!organizationId || !studentNumber || !Number.isFinite(amount)) {
      return response.badRequest({ error: 'organizationId, studentNumber, and amount are required' })
    }

    const idempotencyKey = (request.header('idempotency-key') ?? payload.reference ?? null) as string | null
    if (idempotencyKey) {
      const existing = await db
        .from(t('student_payments'))
        .where({ organization_id: organizationId, idempotency_key: idempotencyKey })
        .first()
      if (existing) {
        const receipt = existing.or_id
          ? await db.from(t('official_receipts')).where('id', existing.or_id).first()
          : null
        return response.ok({ data: { receipt, payment: existing, deduplicated: true } })
      }
    }

    const orNumber = `OR-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`

    const [receipt] = await db
      .table(t('official_receipts'))
      .insert({
        organization_id: organizationId,
        or_number: orNumber,
        payer_name: studentNumber,
        payer_type: 'student',
        payer_reference: studentNumber,
        amount,
        particulars: payload.particulars ?? null,
        issued_at: new Date(),
        issued_by: null,
        created_at: new Date(),
      })
      .returning('*')

    const assessmentNumber = (payload.assessmentNumber as string | undefined) ?? null

    const [payment] = await db
      .table(t('student_payments'))
      .insert({
        organization_id: organizationId,
        student_number: studentNumber,
        or_id: receipt.id,
        amount,
        payment_type: payload.paymentType ?? 'tuition',
        reference: payload.reference ?? null,
        assessment_number: assessmentNumber,
        idempotency_key: idempotencyKey,
        paid_at: new Date(),
        received_by: null,
        created_at: new Date(),
      })
      .returning('*')

    if (assessmentNumber) {
      const assessment = await db
        .from(t('student_assessments'))
        .where({ organization_id: organizationId, assessment_number: assessmentNumber })
        .first()
      if (assessment) {
        const paidRows = await db
          .from(t('student_payments'))
          .where({ organization_id: organizationId, assessment_number: assessmentNumber })
        const paidAmount = paidRows.reduce((s, p) => s + Number(p.amount), 0)
        const net = Number(assessment.net_amount)
        const paymentStatus = paidAmount + 0.001 >= net ? 'paid' : paidAmount > 0 ? 'partial' : 'unpaid'
        await db
          .from(t('student_assessments'))
          .where('id', assessment.id)
          .update({ paid_amount: paidAmount, payment_status: paymentStatus, updated_at: new Date() })
      }
    }

    return response.created({ data: { receipt, payment } })
  }
}
