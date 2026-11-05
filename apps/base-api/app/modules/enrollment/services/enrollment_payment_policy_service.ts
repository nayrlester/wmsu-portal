import db from '@adonisjs/lucid/services/db'
import { t } from '#modules/enrollment/helpers/db_schema'

export type MinimumDueMode = 'full_net' | 'first_installment' | 'downpayment_percent'

export type EnrollmentPaymentPolicyRow = {
  id: string
  organizationId: string
  minimumDueMode: MinimumDueMode
  downpaymentPercent: number | null
  defaultPaymentPlanTemplateId: string | null
}

function round2(n: number) {
  return Math.round(n * 100) / 100
}

export class EnrollmentPaymentPolicyService {
  async getPolicy(organizationId: string): Promise<EnrollmentPaymentPolicyRow> {
    const row = await db.from(t('enrollment_payment_policies')).where('organization_id', organizationId).first()
    if (row) {
      return {
        id: row.id,
        organizationId: row.organization_id,
        minimumDueMode: row.minimum_due_mode as MinimumDueMode,
        downpaymentPercent: row.downpayment_percent == null ? null : Number(row.downpayment_percent),
        defaultPaymentPlanTemplateId: row.default_payment_plan_template_id ?? null,
      }
    }
    return {
      id: '',
      organizationId,
      minimumDueMode: 'first_installment',
      downpaymentPercent: null,
      defaultPaymentPlanTemplateId: null,
    }
  }

  async upsertPolicy(input: {
    organizationId: string
    minimumDueMode: MinimumDueMode
    downpaymentPercent?: number | null
    defaultPaymentPlanTemplateId?: string | null
  }) {
    const existing = await db.from(t('enrollment_payment_policies')).where('organization_id', input.organizationId).first()
    const payload = {
      minimum_due_mode: input.minimumDueMode,
      downpayment_percent: input.downpaymentPercent ?? null,
      default_payment_plan_template_id: input.defaultPaymentPlanTemplateId ?? null,
      updated_at: new Date(),
    }
    if (existing) {
      await db.from(t('enrollment_payment_policies')).where('id', existing.id).update(payload)
      return this.getPolicy(input.organizationId)
    }
    const [row] = await db
      .table(t('enrollment_payment_policies'))
      .insert({
        organization_id: input.organizationId,
        ...payload,
        created_at: new Date(),
      })
      .returning('*')
    return {
      id: row.id,
      organizationId: row.organization_id,
      minimumDueMode: row.minimum_due_mode as MinimumDueMode,
      downpaymentPercent: row.downpayment_percent == null ? null : Number(row.downpayment_percent),
      defaultPaymentPlanTemplateId: row.default_payment_plan_template_id ?? null,
    }
  }

  computeMinimumDue(input: {
    policy: EnrollmentPaymentPolicyRow
    netAmount: number
    installments: Array<{ sequence: number; amount: number; paidAmount: number }>
  }) {
    const net = round2(input.netAmount)
    if (input.installments.length === 0) {
      if (input.policy.minimumDueMode === 'downpayment_percent' && input.policy.downpaymentPercent) {
        return round2((net * input.policy.downpaymentPercent) / 100)
      }
      return net
    }
    const sorted = [...input.installments].sort((a, b) => a.sequence - b.sequence)
    const first = sorted[0]
    if (input.policy.minimumDueMode === 'first_installment') {
      return round2(first.amount)
    }
    if (input.policy.minimumDueMode === 'downpayment_percent' && input.policy.downpaymentPercent) {
      return round2((net * input.policy.downpaymentPercent) / 100)
    }
    return net
  }
}

export const enrollmentPaymentPolicyService = new EnrollmentPaymentPolicyService()
