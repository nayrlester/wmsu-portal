import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import OrSeries from '#modules/finance/models/or_series'
import { t } from '#modules/finance/helpers/db_schema'
import { accountingService } from '#modules/finance/services/ufms/accounting_service'
import { auditLogService } from '#modules/finance/services/audit_log_service'
import { fromCents, toCents } from '#modules/finance/helpers/money'
import { paymentPlanService } from '#modules/finance/services/ufms/payment_plan_service'
import { enrollmentPaymentPolicyService } from '#modules/enrollment/services/enrollment_payment_policy_service'
import { resolveEnrollmentOrganizationId } from '#modules/finance/services/ufms/resolve_organization_id'

type TrxClient = ReturnType<typeof db.transaction> extends Promise<infer R> ? R : never

export type RecordPaymentInput = {
  organizationId: string
  studentNumber: string
  amount: number
  paymentType?: string
  reference?: string | null
  particulars?: string | null
  assessmentNumber?: string | null
  idempotencyKey?: string | null
  receivedBy?: string | null
}

function amountWords(amount: number): string {
  const pesos = Math.floor(amount)
  const centavos = Math.round((amount - pesos) * 100)
  const base = `${pesos.toLocaleString('en-PH')} pesos`
  if (centavos <= 0) return base
  return `${base} and ${centavos}/100`
}

async function getSettings(organizationId: string, trx?: TrxClient) {
  let query = db.from(t('ufms_system_settings')).where('organization_id', organizationId)
  if (trx) {
    query = query.useTransaction(trx)
  }
  const row = await query.first()
  return row as Record<string, unknown> | undefined
}

async function syncOrSeriesNextNumber(series: OrSeries, trx?: TrxClient) {
  let q = db
    .from(t('official_receipts'))
    .where('organization_id', series.organizationId)
    .where('or_series_id', series.id)
    .where('or_number', 'like', `${series.prefix}%`)
  if (trx) q = q.useTransaction(trx)
  const rows = await q.select('or_number')
  let maxN = 0
  for (const row of rows) {
    const raw = String(row.or_number ?? '')
    if (!raw.startsWith(series.prefix)) continue
    const n = Number(raw.slice(series.prefix.length))
    if (Number.isFinite(n) && n > maxN) maxN = n
  }
  if (maxN + 1 > Number(series.nextNumber)) {
    series.nextNumber = maxN + 1
    if (trx) series.useTransaction(trx)
    await series.save()
  }
}

async function ensureTuitionOrSeries(organizationId: string, trx?: TrxClient) {
  let series = await OrSeries.query(trx ? { client: trx } : undefined)
    .where('organizationId', organizationId)
    .where('seriesCode', 'TUITION')
    .first()
  if (series) {
    if (series.prefix === 'OR-') {
      series.prefix = 'OR'
      if (trx) series.useTransaction(trx)
      await series.save()
    }
    await syncOrSeriesNextNumber(series, trx)
    return series
  }
  series = new OrSeries()
  series.organizationId = organizationId
  series.seriesCode = 'TUITION'
  series.prefix = 'OR'
  series.nextNumber = 1
  series.padding = 6
  series.isActive = true
  if (trx) series.useTransaction(trx)
  await series.save()
  await syncOrSeriesNextNumber(series, trx)
  return series
}

async function ensureSettings(organizationId: string, trx?: TrxClient) {
  let row = await getSettings(organizationId, trx)
  if (row) {
    const series = await ensureTuitionOrSeries(organizationId, trx)
    if (!row.tuition_or_series_id) {
      let patch = db
        .from(t('ufms_system_settings'))
        .where('organization_id', organizationId)
        .update({ tuition_or_series_id: series.id, updated_at: new Date() })
      if (trx) patch = patch.useTransaction(trx)
      await patch
      row = { ...row, tuition_or_series_id: series.id }
    }
    return row
  }
  const series = await ensureTuitionOrSeries(organizationId, trx)
  let insert = db.table(t('ufms_system_settings')).insert({
    organization_id: organizationId,
    hard_budget_stop: false,
    tuition_or_series_id: series.id,
    created_at: new Date(),
    updated_at: new Date(),
  })
  if (trx) {
    insert = insert.useTransaction(trx)
  }
  const [created] = await insert.returning('*')
  return created
}

export async function allocateOrNumber(
  organizationId: string,
  orSeriesId: string | null,
  trx: TrxClient
): Promise<{ orNumber: string; orSeriesId: string | null }> {
  if (!orSeriesId) {
    const settings = await ensureSettings(organizationId, trx)
    orSeriesId = (settings.tuition_or_series_id as string | null) ?? null
  }
  if (!orSeriesId) {
    const active = await OrSeries.query({ client: trx })
      .where('organizationId', organizationId)
      .where('isActive', true)
      .orderBy('seriesCode', 'asc')
      .forUpdate()
      .first()
    orSeriesId = active?.id ?? null
  }
  if (!orSeriesId) {
    const err = new Error('No active OR series configured for this organization') as Error & {
      status?: number
    }
    err.status = 422
    throw err
  }
  const series = await OrSeries.query({ client: trx })
    .where('organizationId', organizationId)
    .where('id', orSeriesId)
    .where('isActive', true)
    .forUpdate()
    .first()
  if (!series) {
    const err = new Error('OR series not found or inactive') as Error & { status?: number }
    err.status = 422
    throw err
  }
  let n = Number(series.nextNumber)
  const pad = series.padding || 6
  for (let attempt = 0; attempt < 1000; attempt++) {
    const orNumber = `${series.prefix}${String(n).padStart(pad, '0')}`
    const clash = await trx.from(t('official_receipts')).where('or_number', orNumber).first()
    if (!clash) {
      series.nextNumber = n + 1
      await series.useTransaction(trx).save()
      return { orNumber, orSeriesId: series.id }
    }
    n += 1
  }
  const err = new Error('Unable to allocate unique OR number') as Error & { status?: number }
  err.status = 422
  throw err
}

async function resolveJournalActorId(organizationId: string, actorId: string | null) {
  if (actorId) {
    const existing = await db
      .from(t('users'))
      .where({ id: actorId, organization_id: organizationId })
      .whereNull('deleted_at')
      .first()
    if (existing) return existing.id as string
  }
  const fallback = await db
    .from(t('users'))
    .where({ organization_id: organizationId })
    .whereNull('deleted_at')
    .orderBy('created_at', 'asc')
    .first()
  if (!fallback) {
    throw new Error('No finance user available to post student AR journal entries')
  }
  return fallback.id as string
}

async function postArJournal(
  organizationId: string,
  actorId: string | null,
  kind: 'open' | 'collection',
  amount: number,
  reference: string
) {
  const settings = await ensureSettings(organizationId)
  const receivableId = settings.ar_receivable_account_id as string | null
  const cashId = settings.ar_cash_account_id as string | null
  const revenueId = settings.ar_revenue_account_id as string | null
  const fundId = settings.default_fund_id as string | null
  if (!receivableId || !fundId) return null

  const amt = fromCents(toCents(amount))
  const creditAccountId = kind === 'open' ? revenueId : receivableId
  const debitAccountId = kind === 'open' ? receivableId : cashId
  if (!creditAccountId || !debitAccountId) return null

  const lines = [
    { fundId, accountId: debitAccountId, debitAmount: amt, creditAmount: '0.00', particulars: reference },
    { fundId, accountId: creditAccountId, debitAmount: '0.00', creditAmount: amt, particulars: reference },
  ]

  const journalActorId = await resolveJournalActorId(organizationId, actorId)
  const entry = await accountingService.createJournal(
    { id: journalActorId, organizationId },
    {
      entryType: 'journal',
      fiscalYear: String(DateTime.now().year),
      entryDate: DateTime.now().toISODate(),
      description: kind === 'open' ? `Student AR open — ${reference}` : `Collection — ${reference}`,
      sourceModule: 'receivables',
      sourceRef: reference,
      lines,
    }
  )
  await accountingService.transitionJournal(
    { id: journalActorId, organizationId },
    entry.id,
    'posted'
  )
  return entry
}

export class ReceivablesService {
  async openArFromAssessment(input: {
    organizationId: string
    assessmentId: string
    studentNumber: string
    assessmentNumber: string
    netAmount: number
    programId?: string | null
    yearLevel?: number | null
    classification?: string | null
  }) {
    const existing = await db
      .from(t('student_ar_open_items'))
      .where({
        organization_id: input.organizationId,
        assessment_id: input.assessmentId,
      })
      .first()
    if (existing) return existing

    const [row] = await db
      .table(t('student_ar_open_items'))
      .insert({
        organization_id: input.organizationId,
        student_number: input.studentNumber,
        assessment_id: input.assessmentId,
        assessment_number: input.assessmentNumber,
        source_type: 'assessment',
        reference: input.assessmentNumber,
        original_amount: input.netAmount,
        open_amount: input.netAmount,
        status: 'open',
        opened_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning('*')

    await postArJournal(input.organizationId, null, 'open', input.netAmount, input.assessmentNumber)

    let defaultPaymentPlanTemplateId: string | null = null
    try {
      const enrollmentOrgId = await resolveEnrollmentOrganizationId(input.organizationId)
      const policy = await enrollmentPaymentPolicyService.getPolicy(enrollmentOrgId)
      defaultPaymentPlanTemplateId = policy.defaultPaymentPlanTemplateId
    } catch {
      defaultPaymentPlanTemplateId = null
    }

    await paymentPlanService.createInstallmentsForAssessment({
      organizationId: input.organizationId,
      studentAssessmentId: input.assessmentId,
      assessmentNumber: input.assessmentNumber,
      studentNumber: input.studentNumber,
      netAmount: input.netAmount,
      programId: input.programId ?? null,
      yearLevel: input.yearLevel ?? null,
      classification: input.classification ?? null,
      defaultPaymentPlanTemplateId,
    })

    return row
  }

  async applyPaymentToAr(
    organizationId: string,
    studentNumber: string,
    amount: number,
    assessmentNumber?: string | null,
    trxClient?: TrxClient
  ) {
    const conn = trxClient ?? db
    let remaining = amount
    const q = conn
      .from(t('student_ar_open_items'))
      .where('organization_id', organizationId)
      .where('student_number', studentNumber)
      .where('status', 'open')
      .orderBy('opened_at', 'asc')
    if (assessmentNumber) {
      q.where('assessment_number', assessmentNumber)
    }
    const items = await q
    for (const item of items) {
      if (remaining <= 0) break
      const open = Number(item.open_amount)
      const applied = Math.min(open, remaining)
      const newOpen = open - applied
      remaining -= applied
      await conn
        .from(t('student_ar_open_items'))
        .where('id', item.id)
        .update({
          open_amount: newOpen,
          status: newOpen <= 0.001 ? 'closed' : 'open',
          closed_at: newOpen <= 0.001 ? new Date() : null,
          updated_at: new Date(),
        })
    }
  }

  async linkUnassignedTuitionPayments(organizationId: string, studentNumber: string) {
    const normalized = studentNumber.trim().toLowerCase()
    if (!normalized) return

    await db.transaction(async (trx) => {
      const openItem = await trx
        .from(t('student_ar_open_items'))
        .where('organization_id', organizationId)
        .whereRaw('LOWER(student_number) = ?', [normalized])
        .where('status', 'open')
        .where('open_amount', '>', 0)
        .orderBy('opened_at', 'desc')
        .forUpdate()
        .first()
      if (!openItem?.assessment_number) return

      const payments = await trx
        .from(t('student_payments'))
        .where('organization_id', organizationId)
        .whereRaw('LOWER(student_number) = ?', [normalized])
        .whereNull('assessment_number')
        .where((query) => {
          query.where('payment_type', 'tuition').orWhereNull('payment_type')
        })
        .orderBy('paid_at', 'asc')
        .forUpdate()
      if (!payments.length) return

      for (const payment of payments) {
        await trx.from(t('student_payments')).where('id', payment.id).update({
          assessment_number: openItem.assessment_number,
          student_number: openItem.student_number,
          updated_at: new Date(),
        })
        await this.applyPaymentToAr(
          organizationId,
          String(openItem.student_number),
          Number(payment.amount),
          String(openItem.assessment_number),
          trx
        )
        await paymentPlanService.applyPaymentToInstallments(
          organizationId,
          String(openItem.assessment_number),
          Number(payment.amount),
          trx
        )
      }

      const paidRows = await trx
        .from(t('student_payments'))
        .where({
          organization_id: organizationId,
          assessment_number: openItem.assessment_number,
        })
      const paidAmount = paidRows.reduce((sum, row) => sum + Number(row.amount), 0)
      const assessment = await trx
        .from(t('student_assessments'))
        .where({
          organization_id: organizationId,
          assessment_number: openItem.assessment_number,
        })
        .first()
      if (!assessment) return
      const net = Number(assessment.net_amount)
      const paymentStatus = paidAmount + 0.001 >= net ? 'paid' : paidAmount > 0 ? 'partial' : 'unpaid'
      await trx.from(t('student_assessments')).where('id', assessment.id).update({
        paid_amount: paidAmount,
        payment_status: paymentStatus,
        updated_at: new Date(),
      })
    })
  }

  async recordStudentPayment(input: RecordPaymentInput) {
    return db.transaction(async (trx) => {
      if (input.idempotencyKey) {
        const existing = await trx
          .from(t('student_payments'))
          .where({ organization_id: input.organizationId, idempotency_key: input.idempotencyKey })
          .first()
        if (existing) {
          const receipt = existing.or_id
            ? await trx.from(t('official_receipts')).where('id', existing.or_id).first()
            : null
          return { receipt, payment: existing, deduplicated: true }
        }
      }

      const settings = await ensureSettings(input.organizationId, trx)
      const normalizedStudent = input.studentNumber.trim().toLowerCase()
      const openItem = normalizedStudent
        ? await trx
            .from(t('student_ar_open_items'))
            .where('organization_id', input.organizationId)
            .whereRaw('LOWER(student_number) = ?', [normalizedStudent])
            .where('status', 'open')
            .where('open_amount', '>', 0)
            .orderBy('opened_at', 'desc')
            .first()
        : null
      const studentNumber = openItem?.student_number
        ? String(openItem.student_number)
        : input.studentNumber.trim()
      const assessmentNumber =
        input.assessmentNumber?.trim() ||
        (openItem?.assessment_number ? String(openItem.assessment_number) : null)
      const { orNumber, orSeriesId } = await allocateOrNumber(
        input.organizationId,
        (settings.tuition_or_series_id as string | null) ?? null,
        trx
      )

      const [receipt] = await trx
        .table(t('official_receipts'))
        .insert({
          organization_id: input.organizationId,
          or_number: orNumber,
          or_series_id: orSeriesId,
          payer_name: studentNumber,
          payer_type: 'student',
          payer_reference: studentNumber,
          amount: input.amount,
          particulars: input.particulars ?? null,
          issued_at: new Date(),
          issued_by: input.receivedBy,
          created_at: new Date(),
        })
        .returning('*')

      const [payment] = await trx
        .table(t('student_payments'))
        .insert({
          organization_id: input.organizationId,
          student_number: studentNumber,
          or_id: receipt.id,
          amount: input.amount,
          payment_type: input.paymentType ?? 'tuition',
          reference: input.reference ?? null,
          assessment_number: assessmentNumber,
          idempotency_key: input.idempotencyKey ?? null,
          paid_at: new Date(),
          received_by: input.receivedBy,
          created_at: new Date(),
        })
        .returning('*')

      await this.applyPaymentToAr(
        input.organizationId,
        studentNumber,
        input.amount,
        assessmentNumber,
        trx
      )

      if (assessmentNumber) {
        await paymentPlanService.applyPaymentToInstallments(
          input.organizationId,
          assessmentNumber,
          input.amount,
          trx
        )
      }

      if (assessmentNumber) {
        const assessment = await trx
          .from(t('student_assessments'))
          .where({ organization_id: input.organizationId, assessment_number: assessmentNumber })
          .first()
        if (assessment) {
          const paidRows = await trx
            .from(t('student_payments'))
            .where({ organization_id: input.organizationId, assessment_number: assessmentNumber })
          const paidAmount = paidRows.reduce((s, p) => s + Number(p.amount), 0)
          const net = Number(assessment.net_amount)
          const paymentStatus = paidAmount + 0.001 >= net ? 'paid' : paidAmount > 0 ? 'partial' : 'unpaid'
          await trx
            .from(t('student_assessments'))
            .where('id', assessment.id)
            .update({ paid_amount: paidAmount, payment_status: paymentStatus, updated_at: new Date() })
        }
      }

      await postArJournal(input.organizationId, input.receivedBy, 'collection', input.amount, orNumber)

      await auditLogService.log({
        organizationId: input.organizationId,
        actorUserId: input.receivedBy,
        action: 'create',
        entityType: 'student_payments',
        entityId: payment.id,
        metadata: { orNumber, assessmentNumber, tor: 'FIN-029' },
      })

      return { receipt, payment, deduplicated: false }
    })
  }

  async getPaymentStatus(organizationId: string, assessmentNumber: string) {
    let assessment = await db
      .from(t('student_assessments'))
      .where({ organization_id: organizationId, assessment_number: assessmentNumber })
      .first()
    if (!assessment) {
      assessment = await db
        .from(t('student_assessments'))
        .where({ assessment_number: assessmentNumber })
        .orderBy('assessed_at', 'desc')
        .first()
    }
    if (!assessment) return null

    const assessmentOrgId = String(assessment.organization_id)
    await this.linkUnassignedTuitionPayments(assessmentOrgId, String(assessment.student_number))

    const payments = await db
      .from(t('student_payments'))
      .where((q) => {
        q.where('organization_id', assessmentOrgId).orWhere('organization_id', organizationId)
      })
      .where((q) => {
        q.where('assessment_number', assessmentNumber).orWhere((inner) => {
          inner.whereNull('assessment_number').where('student_number', assessment.student_number)
        })
      })
      .orderBy('paid_at', 'asc')

    const linked = payments.filter(
      (p) => p.assessment_number === assessmentNumber || !p.assessment_number
    )

    const receiptIds = linked.map((p) => p.or_id).filter(Boolean) as string[]
    const receipts =
      receiptIds.length > 0
        ? await db.from(t('official_receipts')).whereIn('id', receiptIds)
        : []
    const orById = new Map(receipts.map((r) => [r.id, r.or_number as string]))

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

    const installmentRows = await paymentPlanService.listInstallments(
      assessmentOrgId,
      assessmentNumber
    )
    const installments = installmentRows.map((row) => ({
      sequence: Number(row.sequence),
      label: String(row.label),
      amount: Number(row.amount),
      paidAmount: Number(row.paid_amount),
      dueDate: row.due_date ? new Date(row.due_date).toISOString() : null,
      status: String(row.status),
    }))
    const policyOrgId = await resolveEnrollmentOrganizationId(assessmentOrgId)
    const policy = await enrollmentPaymentPolicyService.getPolicy(policyOrgId)
    const minimumDueRequired = enrollmentPaymentPolicyService.computeMinimumDue({
      policy,
      netAmount: net,
      installments: installments.map((i) => ({
        sequence: i.sequence,
        amount: i.amount,
        paidAmount: i.paidAmount,
      })),
    })

    return {
      assessmentNumber,
      ufmsAssessmentId: assessment.id,
      paymentStatus,
      assessedAmount: net,
      paidAmount,
      balanceAmount: Math.max(0, net - paidAmount),
      minimumDueRequired,
      installments,
      payments: linked.map((p) => ({
        id: p.id,
        amount: Number(p.amount),
        orNumber: p.or_id ? orById.get(p.or_id) ?? null : null,
        reference: p.reference,
        paidAt: p.paid_at,
      })),
    }
  }

  async getStudentAccount(organizationId: string, studentNumber: string) {
    const normalized = studentNumber.trim().toLowerCase()
    await this.linkUnassignedTuitionPayments(organizationId, studentNumber)
    const openItems = await db
      .from(t('student_ar_open_items'))
      .where('organization_id', organizationId)
      .whereRaw('LOWER(student_number) = ?', [normalized])
      .orderBy('opened_at', 'desc')
    const assessments = await db
      .from(t('student_assessments'))
      .where('organization_id', organizationId)
      .whereRaw('LOWER(student_number) = ?', [normalized])
      .orderBy('assessed_at', 'desc')
    const payments = await db
      .from(t('student_payments'))
      .where('organization_id', organizationId)
      .whereRaw('LOWER(student_number) = ?', [normalized])
      .orderBy('paid_at', 'desc')
      .limit(50)

    const receiptIds = payments.map((p) => p.or_id).filter(Boolean) as string[]
    const receipts =
      receiptIds.length > 0
        ? await db.from(t('official_receipts')).whereIn('id', receiptIds)
        : []
    const orById = new Map(receipts.map((r) => [r.id, r.or_number as string]))

    const openBalance = openItems
      .filter((i) => i.status === 'open')
      .reduce((s, i) => s + Number(i.open_amount), 0)

    const latestAssessment = assessments[0]
    let installmentSchedule: Array<Record<string, unknown>> = []
    let minimumDueRequired: number | null = null
    if (latestAssessment?.assessment_number) {
      const status = await this.getPaymentStatus(
        organizationId,
        String(latestAssessment.assessment_number)
      )
      if (status) {
        minimumDueRequired = status.minimumDueRequired ?? null
        installmentSchedule = (status.installments ?? []).map((i) => ({ ...i }))
      }
    }

    const canonicalStudentNumber =
      (openItems.find((item) => item.status === 'open')?.student_number as string | undefined) ??
      (assessments[0]?.student_number as string | undefined) ??
      studentNumber

    return {
      studentNumber: canonicalStudentNumber,
      openBalance,
      openItems,
      assessments,
      minimumDueRequired,
      installmentSchedule,
      payments: payments.map((p) => ({
        ...p,
        orNumber: p.or_id ? orById.get(p.or_id) : null,
      })),
    }
  }

  async getClearance(organizationId: string, studentNumber: string) {
    const normalized = studentNumber.trim().toLowerCase()
    const openItems = await db
      .from(t('student_ar_open_items'))
      .where('organization_id', organizationId)
      .whereRaw('LOWER(student_number) = ?', [normalized])
      .where('status', 'open')
    const balance = openItems.reduce((s, i) => s + Number(i.open_amount), 0)
    const payments = await db
      .from(t('student_payments'))
      .where('organization_id', organizationId)
      .whereRaw('LOWER(student_number) = ?', [normalized])
      .sum('amount as total_paid')
      .first()
    const totalPaid = Number(payments?.total_paid ?? 0)
    const cleared = balance <= 0.001
    return {
      cleared,
      balance,
      totalPaid,
      openItems: openItems.length,
    }
  }

  async dailyCollectionReport(organizationId: string, businessDate?: string) {
    const day = businessDate ?? DateTime.now().toISODate()!
    const start = DateTime.fromISO(day).startOf('day').toJSDate()
    const end = DateTime.fromISO(day).endOf('day').toJSDate()
    const payments = await db
      .from(t('student_payments'))
      .where('organization_id', organizationId)
      .whereBetween('paid_at', [start, end])
      .orderBy('paid_at', 'asc')

    const receiptIds = payments.map((p) => p.or_id).filter(Boolean) as string[]
    const receipts =
      receiptIds.length > 0
        ? await db.from(t('official_receipts')).whereIn('id', receiptIds)
        : []
    const receiptById = new Map(receipts.map((r) => [r.id, r]))
    const rows = payments.map((p) => {
      const receipt = p.or_id ? receiptById.get(p.or_id) : null
      return {
        id: p.id,
        studentNumber: p.student_number,
        amount: Number(p.amount),
        paymentType: p.payment_type,
        orNumber: receipt?.or_number ?? null,
        particulars: receipt?.particulars ?? null,
        assessmentNumber: p.assessment_number ?? null,
        reference: p.reference ?? null,
        paidAt: p.paid_at,
      }
    })
    const total = rows.reduce((s, r) => s + r.amount, 0)
    return { businessDate: day, total, count: rows.length, rows }
  }

  async createDepositSlip(organizationId: string, input: { bankAccountId?: string; depositDate: string; paymentIds: string[] }) {
    const payments = await db
      .from(t('student_payments'))
      .where('organization_id', organizationId)
      .whereIn('id', input.paymentIds)
    if (!payments.length) throw Object.assign(new Error('No payments selected'), { status: 422 })

    const receiptIds = payments.map((p) => p.or_id).filter(Boolean) as string[]
    const receipts =
      receiptIds.length > 0
        ? await db.from(t('official_receipts')).whereIn('id', receiptIds)
        : []
    const orById = new Map(receipts.map((r) => [r.id, r.or_number as string]))
    const total = payments.reduce((s, p) => s + Number(p.amount), 0)
    const slipNumber = `DS-${DateTime.now().toFormat('yyyyLLdd')}-${Date.now().toString(36).toUpperCase()}`

    return db.transaction(async (trx) => {
      const [slip] = await trx
        .table(t('deposit_slips'))
        .insert({
          organization_id: organizationId,
          slip_number: slipNumber,
          bank_account_id: input.bankAccountId ?? null,
          deposit_date: input.depositDate,
          total_amount: total,
          status: 'posted',
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returning('*')

      for (const p of payments) {
        await trx.table(t('deposit_slip_lines')).insert({
          deposit_slip_id: slip.id,
          payment_id: p.id,
          or_number: p.or_id ? orById.get(p.or_id) ?? null : null,
          amount: p.amount,
          created_at: new Date(),
        })
      }
      return slip
    })
  }

  async getSettings(organizationId: string) {
    return ensureSettings(organizationId)
  }

  async updateSettings(organizationId: string, payload: Record<string, unknown>) {
    await ensureSettings(organizationId)
    const patch: Record<string, unknown> = { updated_at: new Date() }
    if (payload.hardBudgetStop !== undefined) patch.hard_budget_stop = Boolean(payload.hardBudgetStop)
    if (payload.tuitionOrSeriesId !== undefined) patch.tuition_or_series_id = payload.tuitionOrSeriesId
    if (payload.arReceivableAccountId !== undefined) patch.ar_receivable_account_id = payload.arReceivableAccountId
    if (payload.arCashAccountId !== undefined) patch.ar_cash_account_id = payload.arCashAccountId
    if (payload.arRevenueAccountId !== undefined) patch.ar_revenue_account_id = payload.arRevenueAccountId
    if (payload.defaultFundId !== undefined) patch.default_fund_id = payload.defaultFundId
    if (payload.uimsApiUrl !== undefined) patch.uims_api_url = payload.uimsApiUrl
    if (payload.uimsServiceApiKey !== undefined) patch.uims_service_api_key = payload.uimsServiceApiKey

    const [row] = await db
      .from(t('ufms_system_settings'))
      .where('organization_id', organizationId)
      .update(patch)
      .returning('*')
    return row
  }
}

export { amountWords }
export const receivablesService = new ReceivablesService()
