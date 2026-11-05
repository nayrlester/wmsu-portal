import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import { t } from '#modules/finance/helpers/db_schema'
import { randomUUID } from 'node:crypto'
import { receivablesService } from '#modules/finance/services/ufms/receivables_service'
import { resolveFinanceOrganizationId } from '#modules/finance/services/ufms/resolve_organization_id'

export default class InternalAssessmentsController {
  async upsert({ request, response }: HttpContext) {
    const payload = request.body() as Record<string, unknown>
    const organizationId = await resolveFinanceOrganizationId(String(payload.organizationId ?? ''))
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
          ufmsAssessmentId: byKey.id,
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
          ufmsAssessmentId: existing.id,
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

    await receivablesService.openArFromAssessment({
      organizationId,
      assessmentId: row.id,
      studentNumber,
      assessmentNumber,
      netAmount,
      programId: payload.programId ? String(payload.programId) : null,
      yearLevel: payload.yearLevel != null ? Number(payload.yearLevel) : null,
      classification: payload.classification ? String(payload.classification) : null,
    })

    return response.created({
      success: true,
      data: {
        id: row.id,
        ufmsAssessmentId: row.id,
        assessmentNumber: row.assessment_number,
        paymentStatus: row.payment_status,
        deduplicated: false,
      },
    })
  }

  async paymentStatus({ params, request, response }: HttpContext) {
    const organizationId = await resolveFinanceOrganizationId(String(request.input('organizationId') ?? ''))
    const assessmentNumber = String(params.assessmentNumber ?? '')
    if (!organizationId || !assessmentNumber) {
      return response.badRequest({ success: false, error: 'organizationId and assessmentNumber are required' })
    }

    const data = await receivablesService.getPaymentStatus(organizationId, assessmentNumber)
    if (!data) {
      return response.notFound({ success: false, error: 'Assessment not found in UFMS' })
    }

    return response.ok({ success: true, data })
  }
}
