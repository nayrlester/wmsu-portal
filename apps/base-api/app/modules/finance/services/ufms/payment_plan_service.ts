import { randomUUID } from 'node:crypto'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import { t as ft } from '#modules/finance/helpers/db_schema'

export type PlanInstallmentDef =
  | { label: string; percent: number; dueDate?: string | null }
  | { label: string; amount?: number; dueDate?: string | null }

export type PaymentPlanTemplateInput = {
  organizationId: string
  code: string
  name: string
  planType: 'exam_period' | 'monthly'
  programId?: string | null
  yearLevel?: number | null
  classification?: string | null
  downpaymentPercent?: number | null
  installments?: PlanInstallmentDef[]
  monthlyCount?: number | null
  isActive?: boolean
}

function round2(n: number) {
  return Math.round(n * 100) / 100
}

export class PaymentPlanTemplateError extends Error {
  constructor(
    message: string,
    readonly code: string
  ) {
    super(message)
    this.name = 'PaymentPlanTemplateError'
  }
}

function templatePayload(input: PaymentPlanTemplateInput) {
  return {
    name: input.name,
    plan_type: input.planType,
    program_id: input.programId ?? null,
    year_level: input.yearLevel ?? null,
    classification: input.classification ?? null,
    downpayment_percent: input.downpaymentPercent ?? null,
    installments_json: JSON.stringify(input.installments ?? []),
    monthly_count: input.monthlyCount ?? null,
    is_active: input.isActive ?? true,
    updated_at: new Date(),
  }
}

export class PaymentPlanService {
  async upsertTemplate(input: PaymentPlanTemplateInput) {
    const existing = await db
      .from(ft('payment_plan_templates'))
      .where({ organization_id: input.organizationId, code: input.code })
      .first()
    const payload = templatePayload(input)
    if (existing) {
      await db.from(ft('payment_plan_templates')).where('id', existing.id).update(payload)
      return db.from(ft('payment_plan_templates')).where('id', existing.id).first()
    }
    const [row] = await db
      .table(ft('payment_plan_templates'))
      .insert({
        id: randomUUID(),
        organization_id: input.organizationId,
        code: input.code,
        ...payload,
        created_at: new Date(),
      })
      .returning('*')
    return row
  }

  async updateTemplate(input: PaymentPlanTemplateInput & { templateId: string }) {
    const row = await db
      .from(ft('payment_plan_templates'))
      .where({ id: input.templateId, organization_id: input.organizationId })
      .first()
    if (!row) {
      throw new PaymentPlanTemplateError('Payment plan template not found', 'PAYMENT_PLAN_NOT_FOUND')
    }
    const codeTaken = await db
      .from(ft('payment_plan_templates'))
      .where({ organization_id: input.organizationId, code: input.code })
      .whereNot('id', input.templateId)
      .first()
    if (codeTaken) {
      throw new PaymentPlanTemplateError(
        'Payment plan code is already used by another template',
        'PAYMENT_PLAN_CODE_TAKEN'
      )
    }
    const payload = templatePayload(input)
    await db.from(ft('payment_plan_templates')).where('id', input.templateId).update({
      code: input.code,
      ...payload,
    })
    return db.from(ft('payment_plan_templates')).where('id', input.templateId).first()
  }

  async deactivateTemplate(organizationId: string, templateId: string) {
    const row = await db
      .from(ft('payment_plan_templates'))
      .where({ id: templateId, organization_id: organizationId })
      .first()
    if (!row) {
      throw new PaymentPlanTemplateError('Payment plan template not found', 'PAYMENT_PLAN_NOT_FOUND')
    }
    await db
      .from(ft('payment_plan_templates'))
      .where('id', templateId)
      .update({ is_active: false, updated_at: new Date() })
    return db.from(ft('payment_plan_templates')).where('id', templateId).first()
  }

  async listTemplates(organizationId: string) {
    return db
      .from(ft('payment_plan_templates'))
      .where('organization_id', organizationId)
      .where('is_active', true)
      .orderBy('created_at', 'desc')
  }

  async resolveTemplate(input: {
    organizationId: string
    programId?: string | null
    yearLevel?: number | null
    classification?: string | null
    defaultPaymentPlanTemplateId?: string | null
  }) {
    if (input.defaultPaymentPlanTemplateId) {
      const forced = await db
        .from(ft('payment_plan_templates'))
        .where({
          organization_id: input.organizationId,
          id: input.defaultPaymentPlanTemplateId,
          is_active: true,
        })
        .first()
      if (forced) return forced
    }
    const rows = await db
      .from(ft('payment_plan_templates'))
      .where('organization_id', input.organizationId)
      .where('is_active', true)
      .orderBy('created_at', 'desc')
    const score = (row: Record<string, unknown>) => {
      let s = 0
      if (row.program_id && row.program_id !== input.programId) return -1
      if (row.program_id && row.program_id === input.programId) s += 4
      if (row.year_level != null && row.year_level !== input.yearLevel) return -1
      if (row.year_level != null && row.year_level === input.yearLevel) s += 2
      if (row.classification && row.classification !== input.classification) return -1
      if (row.classification && row.classification === input.classification) s += 1
      return s
    }
    let best: Record<string, unknown> | null = null
    let bestScore = -1
    for (const row of rows) {
      const s = score(row)
      if (s > bestScore) {
        bestScore = s
        best = row
      }
    }
    if (bestScore < 0) {
      return rows.find((r) => !r.program_id && !r.year_level && !r.classification) ?? rows[0] ?? null
    }
    return best
  }

  buildInstallmentAmounts(
    netAmount: number,
    template: Record<string, unknown>
  ): Array<{ sequence: number; label: string; amount: number; dueDate: Date | null }> {
    const net = round2(netAmount)
    const planType = String(template.plan_type)
    if (planType === 'monthly') {
      const count = Math.max(1, Number(template.monthly_count ?? 4))
      const base = round2(net / count)
      const rows: Array<{ sequence: number; label: string; amount: number; dueDate: Date | null }> = []
      let allocated = 0
      for (let i = 0; i < count; i++) {
        const isLast = i === count - 1
        const amount = isLast ? round2(net - allocated) : base
        allocated = round2(allocated + amount)
        rows.push({
          sequence: i + 1,
          label: `Month ${i + 1}`,
          amount,
          dueDate: DateTime.now().plus({ months: i }).toJSDate(),
        })
      }
      return rows
    }
    const raw = template.installments_json
    const defs: PlanInstallmentDef[] =
      typeof raw === 'string' ? JSON.parse(raw) : Array.isArray(raw) ? raw : []
    if (defs.length === 0) {
      return [{ sequence: 1, label: 'Full payment', amount: net, dueDate: null }]
    }
    const rows: Array<{ sequence: number; label: string; amount: number; dueDate: Date | null }> = []
    let allocated = 0
    defs.forEach((def, index) => {
      const isLast = index === defs.length - 1
      let amount = 0
      if ('percent' in def && def.percent != null) {
        amount = isLast ? round2(net - allocated) : round2((net * Number(def.percent)) / 100)
      } else if ('amount' in def && def.amount != null) {
        amount = round2(Number(def.amount))
      }
      allocated = round2(allocated + amount)
      rows.push({
        sequence: index + 1,
        label: def.label,
        amount,
        dueDate: def.dueDate ? new Date(def.dueDate) : null,
      })
    })
    const total = round2(rows.reduce((s, r) => s + r.amount, 0))
    if (Math.abs(total - net) > 0.02 && rows.length > 0) {
      rows[rows.length - 1].amount = round2(rows[rows.length - 1].amount + (net - total))
    }
    return rows
  }

  async createInstallmentsForAssessment(input: {
    organizationId: string
    studentAssessmentId: string
    assessmentNumber: string
    studentNumber: string
    netAmount: number
    programId?: string | null
    yearLevel?: number | null
    classification?: string | null
    defaultPaymentPlanTemplateId?: string | null
  }) {
    const existing = await db
      .from(ft('student_installments'))
      .where({ organization_id: input.organizationId, student_assessment_id: input.studentAssessmentId })
      .first()
    if (existing) {
      return this.listInstallments(input.organizationId, input.assessmentNumber)
    }
    const template = await this.resolveTemplate(input)
    if (!template) return []
    const amounts = this.buildInstallmentAmounts(input.netAmount, template)
    for (const row of amounts) {
      await db.table(ft('student_installments')).insert({
        id: randomUUID(),
        organization_id: input.organizationId,
        student_assessment_id: input.studentAssessmentId,
        assessment_number: input.assessmentNumber,
        student_number: input.studentNumber,
        sequence: row.sequence,
        label: row.label,
        due_date: row.dueDate,
        amount: row.amount,
        paid_amount: 0,
        status: 'open',
        created_at: new Date(),
        updated_at: new Date(),
      })
    }
    return this.listInstallments(input.organizationId, input.assessmentNumber)
  }

  async listInstallments(organizationId: string, assessmentNumber: string) {
    return db
      .from(ft('student_installments'))
      .where({ organization_id: organizationId, assessment_number: assessmentNumber })
      .orderBy('sequence', 'asc')
  }

  async applyPaymentToInstallments(
    organizationId: string,
    assessmentNumber: string,
    amount: number,
    trxClient?: typeof db
  ) {
    const conn = trxClient ?? db
    let remaining = amount
    const rows = await conn
      .from(ft('student_installments'))
      .where({ organization_id: organizationId, assessment_number: assessmentNumber })
      .whereIn('status', ['open', 'partial'])
      .orderBy('sequence', 'asc')
    for (const row of rows) {
      if (remaining <= 0) break
      const due = round2(Number(row.amount) - Number(row.paid_amount))
      if (due <= 0) continue
      const applied = Math.min(due, remaining)
      const newPaid = round2(Number(row.paid_amount) + applied)
      remaining = round2(remaining - applied)
      const status = newPaid + 0.001 >= Number(row.amount) ? 'paid' : 'partial'
      await conn
        .from(ft('student_installments'))
        .where('id', row.id)
        .update({
          paid_amount: newPaid,
          status,
          updated_at: new Date(),
        })
    }
  }
}

export const paymentPlanService = new PaymentPlanService()
