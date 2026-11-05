import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import { t } from '#modules/finance/helpers/db_schema'
import { randomUUID } from 'node:crypto'

export default class InternalAssessmentsController {
  async upsert({ request, response }: HttpContext) {
    const payload = request.body() as Record<string, unknown>
    const organizationId = String(payload.organizationId ?? '')
    const studentNumber = String(payload.studentNumber ?? '')
    const assessmentNumber = String(payload.assessmentNumber ?? '')
    const idempotencyKey = String(
      payload.idempotencyKey ?? request.header('idempotency-key') ?? ''
    )
    const netAmount = Number(payload.netAmount)
    const totalAmount = Number(payload.totalAmount)

    if (!organizationId || !studentNumber || !assessmentNumber || !idempotencyKey) {
      return response.badRequest({
        success: false,
        error: 'organizationId, studentNumber, assessmentNumber, and idempotencyKey are required',
      })
    }
    if (!Number.isFinite(netAmount) || !Number.isFinite(totalAmount)) {
      return response.badRequest({ success: false, error: 'totalAmount and netAmount are required' })
    }

    const byKey = await db
      .from(t('student_assessments'))
      .where({ organization_id: organizationId, idempotency_key: idempotencyKey })
      .first()
    if (byKey) {
      return response.ok({
        success: true,
        data: {
          id: byKey.id,
          assessmentNumber: byKey.assessment_number,
          paymentStatus: byKey.payment_status,
          deduplicated: true,
        },
      })
    }

    const existing = await db
      .from(t('student_assessments'))
      .where({ organization_id: organizationId, assessment_number: assessmentNumber })
      .first()

    if (existing) {
      await db
        .from(t('student_assessments'))
        .where('id', existing.id)
        .update({
          tuition_fee: Number(payload.tuitionFee ?? 0),
          misc_fees: Number(payload.miscFees ?? 0),
          discount: Number(payload.discount ?? 0),
          total_amount: totalAmount,
          net_amount: netAmount,
          breakdown: payload.breakdown ? JSON.stringify(payload.breakdown) : existing.breakdown,
          usis_assessment_id: payload.usisAssessmentId ?? existing.usis_assessment_id,
          enrollment_ref: payload.enrollmentRef ?? existing.enrollment_ref,
          updated_at: new Date(),
        })
      return response.ok({
        success: true,
        data: {
          id: existing.id,
          assessmentNumber: existing.assessment_number,
          paymentStatus: existing.payment_status,
          deduplicated: true,
        },
      })
    }

    const id = randomUUID()
    const [row] = await db
      .table(t('student_assessments'))
      .insert({
        id,
        organization_id: organizationId,
        student_number: studentNumber,
        assessment_number: assessmentNumber,
        usis_assessment_id: payload.usisAssessmentId ?? null,
        enrollment_ref: payload.enrollmentRef ?? null,
        tuition_fee: Number(payload.tuitionFee ?? 0),
        misc_fees: Number(payload.miscFees ?? 0),
        discount: Number(payload.discount ?? 0),
        total_amount: totalAmount,
        net_amount: netAmount,
        paid_amount: 0,
        payment_status: 'unpaid',
        breakdown: payload.breakdown ? JSON.stringify(payload.breakdown) : null,
        idempotency_key: idempotencyKey,
        assessed_at: payload.assessedAt ? new Date(String(payload.assessedAt)) : new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning('*')

    return response.created({
      success: true,
      data: {
        id: row.id,
        assessmentNumber: row.assessment_number,
        paymentStatus: row.payment_status,
        deduplicated: false,
      },
    })
  }

  async paymentStatus({ params, request, response }: HttpContext) {
    const organizationId = String(request.input('organizationId') ?? '')
    const assessmentNumber = String(params.assessmentNumber ?? '')
    if (!organizationId || !assessmentNumber) {
      return response.badRequest({ success: false, error: 'organizationId and assessmentNumber are required' })
    }

    const assessment = await db
      .from(t('student_assessments'))
      .where({ organization_id: organizationId, assessment_number: assessmentNumber })
      .first()

    if (!assessment) {
      return response.notFound({ success: false, error: 'Assessment not found in UFMS' })
    }

    const payments = await db
      .from(t('student_payments'))
      .where('organization_id', organizationId)
      .where((q) => {
        q.where('assessment_number', assessmentNumber).orWhere((inner) => {
          inner.whereNull('assessment_number').where('student_number', assessment.student_number)
        })
      })
      .orderBy('paid_at', 'asc')

    const linked = payments.filter(
      (p) => p.assessment_number === assessmentNumber || !p.assessment_number
    )
    const paidAmount = linked.reduce((s, p) => s + Number(p.amount), 0)
    const net = Number(assessment.net_amount)
    let paymentStatus = assessment.payment_status as string
    if (paidAmount <= 0) paymentStatus = 'unpaid'
    else if (paidAmount + 0.001 >= net) paymentStatus = 'paid'
    else paymentStatus = 'partial'

    if (paymentStatus !== assessment.payment_status || Number(assessment.paid_amount) !== paidAmount) {
      await db
        .from(t('student_assessments'))
        .where('id', assessment.id)
        .update({
          paid_amount: paidAmount,
          payment_status: paymentStatus,
          updated_at: new Date(),
        })
    }

    return response.ok({
      success: true,
      data: {
        assessmentNumber,
        ufmsAssessmentId: assessment.id,
        paymentStatus,
        assessedAmount: net,
        paidAmount,
        balanceAmount: Math.max(0, net - paidAmount),
        payments: linked.map((p) => ({
          id: p.id,
          amount: Number(p.amount),
          orNumber: p.or_id ?? null,
          reference: p.reference,
          paidAt: p.paid_at,
        })),
      },
    })
  }
}
