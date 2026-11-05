import type { HttpContext } from '@adonisjs/core/http'
import { AssessmentService } from '#modules/enrollment/services/assessment_service'
import { feeScheduleValidator } from '#modules/enrollment/validators/assessment_finance'
import FeeSchedule from '#modules/enrollment/models/fee_schedule'
import FeeScheduleLine from '#modules/enrollment/models/fee_schedule_line'
import { enrollmentPaymentPolicyService } from '#modules/enrollment/services/enrollment_payment_policy_service'
import {
  resolveEnrollmentOrganizationId,
} from '#modules/finance/services/ufms/resolve_organization_id'
import AcademicYear from '#modules/enrollment/models/academic_year'
import Program from '#modules/enrollment/models/program'
import { EnrollmentWorkflowError } from '#modules/enrollment/domain/enrollment_workflow'
import db from '@adonisjs/lucid/services/db'
import vine from '@vinejs/vine'

const paymentPolicyValidator = vine.compile(
  vine.object({
    minimumDueMode: vine.enum(['full_net', 'first_installment', 'downpayment_percent'] as const),
    downpaymentPercent: vine.number().min(0).max(100).optional(),
    defaultPaymentPlanTemplateId: vine.string().uuid().optional(),
  })
)

export default class TuitionController {
  private async enrollmentOrgId(financeOrgId: string) {
    const organizationId = await resolveEnrollmentOrganizationId(financeOrgId)
    const row = await db.from('enrollment.organizations').where('id', organizationId).first()
    if (!row) {
      throw new Error('USiS organization is not linked to this finance tenant (matching org code required)')
    }
    return organizationId
  }

  async listFeeScheduleScope({ response, auth }: HttpContext) {
    const user = auth.user!
    const organizationId = await this.enrollmentOrgId(user.organizationId)
    const academicYears = await AcademicYear.query()
      .where('organization_id', organizationId)
      .orderBy('start_date', 'desc')
    const programs = await Program.query().where('organization_id', organizationId).orderBy('code', 'asc')
    return response.ok({
      data: {
        academicYears: academicYears.map((y) => ({ id: y.id, code: y.code, name: y.name })),
        programs: programs.map((p) => ({ id: p.id, code: p.code, name: p.name })),
        classifications: [
          { value: 'new', label: 'New student' },
          { value: 'transferee', label: 'Transferee' },
          { value: 'returning', label: 'Returning / old student' },
        ],
      },
    })
  }

  async listFeeSchedules({ response, auth }: HttpContext) {
    const user = auth.user!
    const organizationId = await this.enrollmentOrgId(user.organizationId)
    const rows = await FeeSchedule.query()
      .where('organization_id', organizationId)
      .where('is_active', true)
      .orderBy('created_at', 'desc')
    const data = []
    for (const row of rows) {
      const lines = await FeeScheduleLine.query().where('fee_schedule_id', row.id)
      data.push({ ...row.serialize(), lines: lines.map((l) => l.serialize()) })
    }
    return response.ok({ data })
  }

  async upsertFeeSchedule({ request, response, auth }: HttpContext) {
    const user = auth.user!
    const organizationId = await this.enrollmentOrgId(user.organizationId)
    const payload = await request.validateUsing(feeScheduleValidator)
    const service = new AssessmentService()
    const row = await service.upsertFeeSchedule({
      organizationId,
      ...payload,
    })
    return response.created({ data: row })
  }

  async updateFeeSchedule({ params, request, response, auth }: HttpContext) {
    const user = auth.user!
    const organizationId = await this.enrollmentOrgId(user.organizationId)
    const payload = await request.validateUsing(feeScheduleValidator)
    const service = new AssessmentService()
    try {
      const row = await service.updateFeeSchedule({
        organizationId,
        scheduleId: params.id,
        ...payload,
      })
      return response.ok({ data: row })
    } catch (err) {
      if (err instanceof EnrollmentWorkflowError && err.code === 'FEE_SCHEDULE_CODE_TAKEN') {
        return response.conflict({ error: err.message, code: err.code })
      }
      throw err
    }
  }

  async deactivateFeeSchedule({ params, response, auth }: HttpContext) {
    const user = auth.user!
    const organizationId = await this.enrollmentOrgId(user.organizationId)
    const service = new AssessmentService()
    const row = await service.deactivateFeeSchedule({
      organizationId,
      scheduleId: params.id,
    })
    return response.ok({ data: row })
  }

  async getPaymentPolicy({ response, auth }: HttpContext) {
    const user = auth.user!
    const organizationId = await this.enrollmentOrgId(user.organizationId)
    const data = await enrollmentPaymentPolicyService.getPolicy(organizationId)
    return response.ok({ data })
  }

  async upsertPaymentPolicy({ request, response, auth }: HttpContext) {
    const user = auth.user!
    const organizationId = await this.enrollmentOrgId(user.organizationId)
    const payload = await request.validateUsing(paymentPolicyValidator)
    const data = await enrollmentPaymentPolicyService.upsertPolicy({
      organizationId,
      minimumDueMode: payload.minimumDueMode,
      downpaymentPercent: payload.downpaymentPercent ?? null,
      defaultPaymentPlanTemplateId: payload.defaultPaymentPlanTemplateId ?? null,
    })
    return response.ok({ data })
  }
}
