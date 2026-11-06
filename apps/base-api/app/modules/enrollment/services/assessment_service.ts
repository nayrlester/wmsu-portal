import { createHash, randomUUID } from 'node:crypto'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import Enrollment from '#modules/enrollment/models/enrollment'
import Student from '#modules/enrollment/models/student'
import Assessment from '#modules/enrollment/models/assessment'
import AssessmentLine from '#modules/enrollment/models/assessment_line'
import AssessmentAidTag from '#modules/enrollment/models/assessment_aid_tag'
import FeeSchedule from '#modules/enrollment/models/fee_schedule'
import FeeScheduleLine from '#modules/enrollment/models/fee_schedule_line'
import EnrollmentLine from '#modules/enrollment/models/enrollment_line'
import StudentDeficiency from '#modules/enrollment/models/student_deficiency'
import BalanceSnapshot from '#modules/enrollment/models/balance_snapshot'
import RegistrationDocument from '#modules/enrollment/models/registration_document'
import FinanceIntegrationTransaction from '#modules/enrollment/models/finance_integration_transaction'
import Payment from '#modules/enrollment/models/payment'
import GradeEntry from '#modules/enrollment/models/grade_entry'
import { EnrollmentWorkflowError } from '#modules/enrollment/domain/enrollment_workflow'
import {
  createFinanceAssessmentClient,
  type FinanceAssessmentGateway,
} from '#modules/enrollment/services/integrations/finance_assessment_client'
import { assertAdvisingGate } from '#modules/enrollment/services/enrollment_approval_policy_service'
import { enrollmentPaymentPolicyService } from '#modules/enrollment/services/enrollment_payment_policy_service'

function round2(n: number) {
  return Math.round(n * 100) / 100
}

function linesForFee(subjectLines: EnrollmentLine[], subjectCode: string | null | undefined) {
  if (!subjectCode?.trim()) return subjectLines
  return subjectLines.filter((l) => String(l.subjectCode ?? '') === subjectCode.trim())
}

function quantityForScheduleLine(
  line: FeeScheduleLine,
  subjectLines: EnrollmentLine[]
) {
  const scoped = linesForFee(subjectLines, line.subjectCode)
  if (line.subjectCode?.trim() && scoped.length === 0) return 0
  const unit = Number(line.amount)
  if (line.calculationMethod === 'per_unit') {
    return scoped.reduce((s, l) => s + Number(l.units), 0)
  }
  if (line.calculationMethod === 'per_subject') {
    return scoped.length
  }
  return scoped.length > 0 || !line.subjectCode?.trim() ? 1 : 0
}

function feeScheduleClassificationCandidates(classification: string | null | undefined) {
  const value = (classification ?? '').trim().toLowerCase()
  if (value === 'freshman' || value === 'new') return ['freshman', 'new']
  if (value === 'continuing' || value === 'old') return ['continuing', 'old']
  if (!value) return []
  return [value]
}

export class AssessmentService {
  constructor(private finance: FinanceAssessmentGateway = createFinanceAssessmentClient()) {}

  async upsertFeeSchedule(input: {
    organizationId: string
    code: string
    name: string
    academicYearId?: string | null
    semester?: number | null
    classification?: string | null
    programId?: string | null
    approvedByRole?: string | null
    lines: Array<{
      feeCode: string
      description: string
      feeType: string
      calculationMethod: 'fixed' | 'per_unit' | 'per_subject'
      amount: number
      subjectCode?: string | null
      priority?: number
    }>
  }) {
    return db.transaction(async (trx) => {
      const schedule = await FeeSchedule.updateOrCreate(
        { organizationId: input.organizationId, code: input.code },
        {
          organizationId: input.organizationId,
          code: input.code,
          name: input.name,
          academicYearId: input.academicYearId ?? null,
          semester: input.semester ?? null,
          classification: input.classification ?? null,
          programId: input.programId ?? null,
          approvedByRole: input.approvedByRole ?? null,
          isActive: true,
          effectiveFrom: DateTime.now(),
        },
        { client: trx }
      )
      await FeeScheduleLine.query({ client: trx }).where('fee_schedule_id', schedule.id).delete()
      for (const line of input.lines) {
        await FeeScheduleLine.create(
          {
            organizationId: input.organizationId,
            feeScheduleId: schedule.id,
            feeCode: line.feeCode,
            description: line.description,
            feeType: line.feeType,
            calculationMethod: line.calculationMethod,
            amount: line.amount,
            subjectCode: line.subjectCode ?? null,
            priority: line.priority ?? 100,
            isActive: true,
          },
          { client: trx }
        )
      }
      const lines = await FeeScheduleLine.query({ client: trx }).where('fee_schedule_id', schedule.id)
      return { schedule, lines }
    })
  }

  async updateFeeSchedule(input: {
    organizationId: string
    scheduleId: string
    code: string
    name: string
    academicYearId?: string | null
    semester?: number | null
    classification?: string | null
    programId?: string | null
    approvedByRole?: string | null
    lines: Array<{
      feeCode: string
      description: string
      feeType: string
      calculationMethod: 'fixed' | 'per_unit' | 'per_subject'
      amount: number
      subjectCode?: string | null
      priority?: number
    }>
  }) {
    return db.transaction(async (trx) => {
      const schedule = await FeeSchedule.query({ client: trx })
        .where('id', input.scheduleId)
        .where('organization_id', input.organizationId)
        .forUpdate()
        .firstOrFail()

      const codeTaken = await FeeSchedule.query({ client: trx })
        .where('organization_id', input.organizationId)
        .where('code', input.code)
        .whereNot('id', schedule.id)
        .first()
      if (codeTaken) {
        throw new EnrollmentWorkflowError('Fee schedule code is already used by another schedule', 409, 'FEE_SCHEDULE_CODE_TAKEN')
      }

      schedule.merge({
        code: input.code,
        name: input.name,
        academicYearId: input.academicYearId ?? null,
        semester: input.semester ?? null,
        classification: input.classification ?? null,
        programId: input.programId ?? null,
        approvedByRole: input.approvedByRole ?? null,
        isActive: true,
        effectiveTo: null,
      })
      await schedule.save()

      await FeeScheduleLine.query({ client: trx }).where('fee_schedule_id', schedule.id).delete()
      for (const line of input.lines) {
        await FeeScheduleLine.create(
          {
            organizationId: input.organizationId,
            feeScheduleId: schedule.id,
            feeCode: line.feeCode,
            description: line.description,
            feeType: line.feeType,
            calculationMethod: line.calculationMethod,
            amount: line.amount,
            subjectCode: line.subjectCode ?? null,
            priority: line.priority ?? 100,
            isActive: true,
          },
          { client: trx }
        )
      }
      const lines = await FeeScheduleLine.query({ client: trx }).where('fee_schedule_id', schedule.id)
      return { schedule, lines }
    })
  }

  async deactivateFeeSchedule(input: { organizationId: string; scheduleId: string }) {
    const schedule = await FeeSchedule.query()
      .where('id', input.scheduleId)
      .where('organization_id', input.organizationId)
      .firstOrFail()
    schedule.isActive = false
    schedule.effectiveTo = DateTime.now()
    await schedule.save()
    return schedule
  }

  async tagAid(input: {
    organizationId: string
    studentId: string
    enrollmentId?: string | null
    tagType: 'scholarship' | 'discount' | 'voucher' | 'subsidy' | 'unifast'
    code: string
    name: string
    calculationMethod: 'fixed' | 'percent'
    value: number
    notes?: string | null
    taggedBy: string
  }) {
    return AssessmentAidTag.create({
      organizationId: input.organizationId,
      studentId: input.studentId,
      enrollmentId: input.enrollmentId ?? null,
      tagType: input.tagType,
      code: input.code,
      name: input.name,
      calculationMethod: input.calculationMethod,
      value: input.value,
      unifast: input.tagType === 'unifast',
      status: 'active',
      notes: input.notes ?? null,
      taggedBy: input.taggedBy,
    })
  }

  async prepareAssessment(input: {
    organizationId: string
    enrollmentId: string
    actorUserId: string
    feeScheduleId?: string | null
    tuitionFee?: number
    miscFees?: number
    discount?: number
  }) {
    return db.transaction(async (trx) => {
      const enrollment = await Enrollment.query({ client: trx })
        .where('id', input.enrollmentId)
        .where('organization_id', input.organizationId)
        .forUpdate()
        .firstOrFail()

      if (!enrollment.advisingWaived) {
        await assertAdvisingGate(enrollment, trx)
      }

      if (enrollment.requiresReadvising) {
        throw new EnrollmentWorkflowError(
          'Re-advising is required after subject/schedule changes (ENR-017B)',
          409,
          'READVISING_REQUIRED'
        )
      }

      if (
        !['advised', 'incomplete', 'assessed', 'payment_verified', 'registrar_approved', 'registered'].includes(
          enrollment.status
        )
      ) {
        throw new EnrollmentWorkflowError(
          `Cannot assess enrollment in status ${enrollment.status}`,
          409,
          'INVALID_STATUS'
        )
      }

      const student = await Student.findOrFail(enrollment.studentId, { client: trx })
      const subjectLines = await EnrollmentLine.query({ client: trx })
        .where('enrollment_id', enrollment.id)
        .whereNot('status', 'dropped')
      const totalUnits = subjectLines.reduce((s, l) => s + Number(l.units), 0)

      let schedule: FeeSchedule | null = null
      if (input.feeScheduleId) {
        schedule = await FeeSchedule.query({ client: trx })
          .where('id', input.feeScheduleId)
          .where('organization_id', input.organizationId)
          .firstOrFail()
      } else {
        const candidates = feeScheduleClassificationCandidates(enrollment.classification)
        const scheduleQuery = FeeSchedule.query({ client: trx })
          .where('organization_id', input.organizationId)
          .where('is_active', true)
          .if(enrollment.academicYearId, (q) =>
            q.where((b) => b.where('academic_year_id', enrollment.academicYearId).orWhereNull('academic_year_id'))
          )
          .if(enrollment.semester, (q) =>
            q.where((b) => b.where('semester', enrollment.semester).orWhereNull('semester'))
          )
          .if(student.programId, (q) =>
            q.where((b) => b.where('program_id', student.programId).orWhereNull('program_id'))
          )
        if (candidates.length) {
          scheduleQuery.where((b) => b.whereIn('classification', candidates).orWhereNull('classification'))
        }
        const matches = await scheduleQuery
        const exact = (enrollment.classification ?? '').trim().toLowerCase()
        matches.sort((a, b) => {
          const rank = (row: FeeSchedule) => {
            const value = (row.classification ?? '').trim().toLowerCase()
            if (value && value === exact) return 0
            if (value && candidates.includes(value)) return 1
            return 2
          }
          const byRank = rank(a) - rank(b)
          if (byRank !== 0) return byRank
          return b.createdAt.toMillis() - a.createdAt.toMillis()
        })
        schedule = matches[0] ?? null
      }

      const scheduleLines = schedule
        ? await FeeScheduleLine.query({ client: trx })
            .where('fee_schedule_id', schedule.id)
            .where('is_active', true)
            .orderBy('priority', 'asc')
        : []

      const chargeLines: Array<{
        feeCode: string
        description: string
        feeType: string
        quantity: number
        unitAmount: number
        amount: number
        isAid: boolean
        aidSource: string | null
      }> = []

      let tuitionFee = input.tuitionFee
      let miscFees = input.miscFees

      if (schedule && scheduleLines.length) {
        tuitionFee = 0
        miscFees = 0
        for (const line of scheduleLines) {
          const qty = quantityForScheduleLine(line, subjectLines)
          if (qty <= 0) continue
          const unit = Number(line.amount)
          const amount = round2(qty * unit)
          chargeLines.push({
            feeCode: line.feeCode,
            description: line.description,
            feeType: line.feeType,
            quantity: qty,
            unitAmount: unit,
            amount,
            isAid: false,
            aidSource: null,
          })
          if (line.feeType === 'tuition') tuitionFee += amount
          else miscFees += amount
        }
      } else {
        tuitionFee = Number(tuitionFee ?? 0)
        miscFees = Number(miscFees ?? 0)
        if (tuitionFee > 0) {
          chargeLines.push({
            feeCode: 'TUITION',
            description: 'Tuition',
            feeType: 'tuition',
            quantity: 1,
            unitAmount: tuitionFee,
            amount: tuitionFee,
            isAid: false,
            aidSource: null,
          })
        }
        if (miscFees > 0) {
          chargeLines.push({
            feeCode: 'MISC',
            description: 'Miscellaneous fees',
            feeType: 'miscellaneous',
            quantity: 1,
            unitAmount: miscFees,
            amount: miscFees,
            isAid: false,
            aidSource: null,
          })
        }
      }

      const tags = await AssessmentAidTag.query({ client: trx })
        .where('organization_id', input.organizationId)
        .where('student_id', student.id)
        .where('status', 'active')
        .where((q) => q.where('enrollment_id', enrollment.id).orWhereNull('enrollment_id'))

      const gross = round2(chargeLines.reduce((s, l) => s + l.amount, 0))
      let discount = Number(input.discount ?? 0)
      let unifastTagged = false
      for (const tag of tags) {
        unifastTagged = unifastTagged || tag.unifast || tag.tagType === 'unifast'
        let aidAmount = 0
        if (tag.calculationMethod === 'percent') {
          aidAmount = round2((gross * Number(tag.value)) / 100)
        } else {
          aidAmount = round2(Number(tag.value))
        }
        discount = round2(discount + aidAmount)
        chargeLines.push({
          feeCode: tag.code,
          description: tag.name,
          feeType: tag.tagType,
          quantity: 1,
          unitAmount: -aidAmount,
          amount: -aidAmount,
          isAid: true,
          aidSource: tag.tagType,
        })
      }

      const totalAmount = gross
      const netAmount = round2(Math.max(0, totalAmount - discount))
      const assessmentNumber = `ASM-${Date.now()}-${enrollment.id.slice(0, 8)}`

      const prior = await Assessment.query({ client: trx }).where('enrollment_id', enrollment.id).orderBy('version', 'desc').first()
      const version = prior ? Number(prior.version || 1) + 1 : 1
      await Assessment.query({ client: trx }).where('enrollment_id', enrollment.id).delete()

      const assessment = await Assessment.create(
        {
          organizationId: enrollment.organizationId,
          enrollmentId: enrollment.id,
          assessmentNumber,
          tuitionFee: round2(tuitionFee ?? 0),
          miscFees: round2(miscFees ?? 0),
          totalAmount,
          discount,
          netAmount,
          feeScheduleId: schedule?.id ?? null,
          status: 'prepared',
          ufmsSyncStatus: 'pending',
          ufmsPaymentStatus: 'unpaid',
          paidAmount: 0,
          balanceAmount: netAmount,
          unifastTagged,
          version,
          breakdown: {
            totalUnits,
            subjectCount: subjectLines.length,
            lines: chargeLines,
            aidTags: tags.map((t) => ({ code: t.code, type: t.tagType, value: t.value })),
          },
          assessedAt: DateTime.now(),
          assessedBy: input.actorUserId,
        },
        { client: trx }
      )

      for (const line of chargeLines) {
        await AssessmentLine.create(
          {
            organizationId: enrollment.organizationId,
            assessmentId: assessment.id,
            ...line,
          },
          { client: trx }
        )
      }

      enrollment.useTransaction(trx)
      enrollment.assessedAt = DateTime.now()
      enrollment.requiresReassessment = false
      const previousPaid = Number(prior?.paidAmount ?? 0)
      const laterStatus = ['payment_verified', 'registrar_approved', 'registered'].includes(enrollment.status)
      if (laterStatus && previousPaid + 0.001 < netAmount) {
        enrollment.paymentVerified = false
        enrollment.paymentVerifiedAt = null
        enrollment.paymentVerifiedBy = null
        enrollment.registrarApprovedAt = null
        enrollment.registrarApprovedBy = null
        enrollment.registeredAt = null
        enrollment.status = 'assessed'
      } else if (!laterStatus) {
        enrollment.status = 'assessed'
      }
      await enrollment.save()

      return { assessment, lines: chargeLines, enrollment }
    })
  }

  async submitToUfms(input: {
    organizationId: string
    assessmentId: string
    idempotencyKey?: string
  }) {
    const assessment = await Assessment.query()
      .where('id', input.assessmentId)
      .where('organization_id', input.organizationId)
      .firstOrFail()
    const enrollment = await Enrollment.findOrFail(assessment.enrollmentId)
    const student = await Student.findOrFail(enrollment.studentId)

    const existing = input.idempotencyKey
      ? await FinanceIntegrationTransaction.query()
          .where('organization_id', input.organizationId)
          .where('idempotency_key', input.idempotencyKey)
          .where('status', 'succeeded')
          .first()
      : null
    if (existing?.responsePayload) {
      return { assessment, deduplicated: true, transaction: existing }
    }

    const idempotencyKey =
      input.idempotencyKey ?? `usis-assess-submit:${assessment.id}:v${assessment.version}`

    const requestPayload = {
      organizationId: input.organizationId,
      studentNumber: student.studentNumber,
      assessmentNumber: assessment.assessmentNumber,
      usisAssessmentId: assessment.id,
      enrollmentRef: enrollment.id,
      tuitionFee: Number(assessment.tuitionFee),
      miscFees: Number(assessment.miscFees),
      discount: Number(assessment.discount),
      totalAmount: Number(assessment.totalAmount),
      netAmount: Number(assessment.netAmount),
      breakdown: assessment.breakdown ?? {},
      assessedAt: assessment.assessedAt.toISO()!,
      idempotencyKey,
      programId: student.programId,
      yearLevel: enrollment.yearLevel,
      classification: enrollment.classification,
    }

    try {
      const result = await this.finance.submitAssessment(requestPayload)
      assessment.ufmsAssessmentId = result.ufmsAssessmentId
      assessment.ufmsSyncStatus = 'submitted'
      assessment.ufmsPaymentStatus = result.paymentStatus
      assessment.status = 'submitted'
      assessment.submittedToUfmsAt = DateTime.now()
      assessment.lastIdempotencyKey = idempotencyKey
      await assessment.save()

      const tx = await FinanceIntegrationTransaction.create({
        organizationId: input.organizationId,
        enrollmentId: enrollment.id,
        assessmentId: assessment.id,
        operation: 'assessment.submit',
        idempotencyKey,
        direction: 'outbound',
        status: 'succeeded',
        httpStatus: result.httpStatus,
        requestPayload,
        responsePayload: result.raw,
        errorMessage: null,
      })
      return { assessment, deduplicated: false, transaction: tx }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'UFMS submit failed'
      await FinanceIntegrationTransaction.create({
        organizationId: input.organizationId,
        enrollmentId: enrollment.id,
        assessmentId: assessment.id,
        operation: 'assessment.submit',
        idempotencyKey,
        direction: 'outbound',
        status: 'failed',
        httpStatus: null,
        requestPayload,
        responsePayload: null,
        errorMessage: message,
      })
      assessment.ufmsSyncStatus = 'failed'
      await assessment.save()
      throw new EnrollmentWorkflowError(message, 502, 'UFMS_SUBMIT_FAILED')
    }
  }

  async syncPaymentStatus(input: {
    organizationId: string
    assessmentId: string
    actorUserId?: string | null
    idempotencyKey?: string
  }) {
    const assessment = await Assessment.query()
      .where('id', input.assessmentId)
      .where('organization_id', input.organizationId)
      .firstOrFail()
    const enrollment = await Enrollment.findOrFail(assessment.enrollmentId)
    const student = await Student.findOrFail(enrollment.studentId)
    const idempotencyKey =
      input.idempotencyKey ?? `usis-pay-sync:${assessment.id}:${DateTime.now().toFormat('yyyyLLddHH')}`

    try {
      const status = await this.finance.getPaymentStatus({
        organizationId: input.organizationId,
        assessmentNumber: assessment.assessmentNumber,
      })

      assessment.ufmsPaymentStatus = status.paymentStatus
      assessment.paidAmount = Number(status.paidAmount)
      assessment.balanceAmount = Number(status.balanceAmount)
      assessment.ufmsAssessmentId = status.ufmsAssessmentId || assessment.ufmsAssessmentId
      await assessment.save()

      await BalanceSnapshot.create({
        organizationId: input.organizationId,
        studentId: student.id,
        enrollmentId: enrollment.id,
        assessmentId: assessment.id,
        assessedAmount: Number(status.assessedAmount),
        paidAmount: Number(status.paidAmount),
        balanceAmount: Number(status.balanceAmount),
        source: 'ufms',
        ufmsAssessmentId: status.ufmsAssessmentId,
        asOf: DateTime.now(),
      })

      for (const p of status.payments) {
        const exists = await Payment.query()
          .where('organization_id', input.organizationId)
          .where('ufms_payment_id', p.id)
          .first()
        if (exists) continue
        await Payment.create({
          organizationId: input.organizationId,
          studentId: student.id,
          enrollmentId: enrollment.id,
          assessmentId: assessment.id,
          orNumber: p.orNumber,
          amount: p.amount,
          paymentType: 'ufms_confirmed',
          reference: p.reference,
          ufmsPaymentId: p.id,
          confirmationSource: 'ufms',
          ufmsConfirmed: true,
          paidAt: DateTime.fromISO(p.paidAt) ?? DateTime.now(),
          receivedBy: input.actorUserId ?? null,
        })
      }

      await FinanceIntegrationTransaction.updateOrCreate(
        { organizationId: input.organizationId, idempotencyKey },
        {
          organizationId: input.organizationId,
          enrollmentId: enrollment.id,
          assessmentId: assessment.id,
          operation: 'payment.status.sync',
          idempotencyKey,
          direction: 'outbound',
          status: 'succeeded',
          httpStatus: 200,
          requestPayload: { assessmentNumber: assessment.assessmentNumber },
          responsePayload: status as unknown as Record<string, unknown>,
          errorMessage: null,
        }
      )

      return { assessment, enrollment, status }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'UFMS payment sync failed'
      await FinanceIntegrationTransaction.create({
        organizationId: input.organizationId,
        enrollmentId: enrollment.id,
        assessmentId: assessment.id,
        operation: 'payment.status.sync',
        idempotencyKey,
        direction: 'outbound',
        status: 'failed',
        httpStatus: null,
        requestPayload: { assessmentNumber: assessment.assessmentNumber },
        responsePayload: null,
        errorMessage: message,
      })
      throw new EnrollmentWorkflowError(message, 502, 'UFMS_PAYMENT_SYNC_FAILED')
    }
  }

  async verifyPaymentFromUfms(enrollmentId: string, actorUserId: string) {
    const enrollmentProbe = await Enrollment.findOrFail(enrollmentId)
    if (enrollmentProbe.requiresReassessment) {
      throw new EnrollmentWorkflowError('Re-assessment required after schedule changes', 409, 'REASSESSMENT_REQUIRED')
    }
    const assessmentProbe = await Assessment.query().where('enrollment_id', enrollmentId).first()
    if (!assessmentProbe) {
      throw new EnrollmentWorkflowError(
        `Enrollment is ${enrollmentProbe.status}. An adviser endorses the draft, then registrar staff prepare the assessment. Payment cannot be verified before that assessment exists.`,
        422,
        'ASSESSMENT_REQUIRED'
      )
    }
    if (!assessmentProbe.ufmsAssessmentId && assessmentProbe.ufmsSyncStatus !== 'submitted') {
      throw new EnrollmentWorkflowError(
        'Assessment must be submitted to UFMS before payment verification',
        422,
        'UFMS_ASSESSMENT_REQUIRED'
      )
    }

    const synced = await this.syncPaymentStatus({
      organizationId: enrollmentProbe.organizationId,
      assessmentId: assessmentProbe.id,
      actorUserId,
    })

    const required =
      synced.status.minimumDueRequired != null
        ? Number(synced.status.minimumDueRequired)
        : Number(assessmentProbe.netAmount)

    if (synced.status.paidAmount + 0.001 < required) {
      const paid = Number(synced.status.paidAmount)
      throw new EnrollmentWorkflowError(
        `UFMS has not confirmed the registration minimum due (paid ${paid.toFixed(2)} of ${required.toFixed(2)}). Collect at least the minimum at the UFMS cashier, then verify again.`,
        422,
        'PAYMENT_NOT_CONFIRMED',
        {
          paymentStatus: synced.status.paymentStatus,
          paid,
          required,
          netAmount: Number(assessmentProbe.netAmount),
        }
      )
    }

    return db.transaction(async (trx) => {
      const enrollment = await Enrollment.query({ client: trx }).where('id', enrollmentId).forUpdate().firstOrFail()
      if (enrollment.requiresReassessment) {
        throw new EnrollmentWorkflowError('Re-assessment required after schedule changes', 409, 'REASSESSMENT_REQUIRED')
      }
      const assessment = await Assessment.query({ client: trx }).where('enrollment_id', enrollment.id).firstOrFail()
      const minDue =
        synced.status.minimumDueRequired != null
          ? Number(synced.status.minimumDueRequired)
          : Number(assessment.netAmount)
      if (Number(assessment.paidAmount) + 0.001 < minDue) {
        const paid = Number(assessment.paidAmount)
        throw new EnrollmentWorkflowError(
          `UFMS has not confirmed the registration minimum due (paid ${paid.toFixed(2)} of ${minDue.toFixed(2)}). Collect at least the minimum at the UFMS cashier, then verify again.`,
          422,
          'PAYMENT_NOT_CONFIRMED',
          {
            paymentStatus: assessment.ufmsPaymentStatus,
            paid,
            required: minDue,
            netAmount: Number(assessment.netAmount),
          }
        )
      }

      enrollment.useTransaction(trx)
      enrollment.paymentVerified = true
      enrollment.paymentVerifiedAt = DateTime.now()
      enrollment.paymentVerifiedBy = actorUserId
      enrollment.status = 'payment_verified'
      await enrollment.save()
      return enrollment
    })
  }

  async listDeficienciesAndBalance(organizationId: string, studentId: string) {
    return this.getStudentAccountMonitor(organizationId, studentId)
  }

  async getStudentAccountMonitor(organizationId: string, studentId: string) {
    const student = await Student.query()
      .where('organization_id', organizationId)
      .where('id', studentId)
      .whereNull('deleted_at')
      .firstOrFail()

    const deficiencies = await StudentDeficiency.query()
      .where({ organization_id: organizationId, student_id: studentId })
      .whereNull('deleted_at')
      .orderBy('created_at', 'desc')

    const latestBalance = await BalanceSnapshot.query()
      .where({ organization_id: organizationId, student_id: studentId })
      .orderBy('as_of', 'desc')
      .first()

    const enrollmentIds = (
      await Enrollment.query().where('organization_id', organizationId).where('student_id', studentId).select('id')
    ).map((e) => e.id)

    const latestAssessment =
      enrollmentIds.length === 0
        ? null
        : await Assessment.query()
            .where('organization_id', organizationId)
            .whereIn('enrollment_id', enrollmentIds)
            .orderBy('created_at', 'desc')
            .first()

    const tuitionBalance = latestBalance
      ? {
          assessedAmount: Number(latestBalance.assessedAmount),
          paidAmount: Number(latestBalance.paidAmount),
          balanceAmount: Number(latestBalance.balanceAmount),
          source: latestBalance.source,
          asOf: latestBalance.asOf?.toISO() ?? null,
          assessmentId: latestBalance.assessmentId,
        }
      : latestAssessment
        ? {
            assessedAmount: Number(latestAssessment.netAmount),
            paidAmount: Number(latestAssessment.paidAmount ?? 0),
            balanceAmount: Number(
              latestAssessment.balanceAmount ??
                Math.max(0, Number(latestAssessment.netAmount) - Number(latestAssessment.paidAmount ?? 0))
            ),
            source: 'assessment',
            asOf: latestAssessment.updatedAt?.toISO() ?? latestAssessment.createdAt?.toISO() ?? null,
            assessmentId: latestAssessment.id,
          }
        : null

    const runningGrades = await GradeEntry.query()
      .where('organization_id', organizationId)
      .where((q) => {
        q.where('student_id', studentId)
        if (enrollmentIds.length) q.orWhereIn('enrollment_id', enrollmentIds)
      })
      .whereIn('status', ['draft', 'submitted', 'posted', 'locked', 'final'])
      .orderBy('updated_at', 'desc')
      .limit(100)

    const assessmentForms =
      enrollmentIds.length === 0
        ? []
        : await RegistrationDocument.query()
            .where('organization_id', organizationId)
            .whereIn('enrollment_id', enrollmentIds)
            .where('doc_type', 'assessment_form')
            .orderBy('issued_at', 'desc')
            .limit(20)

    const openDeficiencyCount = deficiencies.filter((d) =>
      ['open', 'submitted', 'rejected'].includes(d.status)
    ).length

    let assessmentBreakdown: Array<{
      feeCode: string
      description: string
      feeType: string
      quantity: number
      unitAmount: number
      amount: number
    }> = []
    if (latestAssessment) {
      const rawBreakdown = latestAssessment.breakdown as {
        lines?: Array<{
          feeCode?: string
          description?: string
          feeType?: string
          quantity?: number
          unitAmount?: number
          amount?: number
          isAid?: boolean
        }>
      } | null
      const fromJson = (rawBreakdown?.lines ?? []).filter((l) => !l.isAid)
      if (fromJson.length) {
        assessmentBreakdown = fromJson.map((l) => ({
          feeCode: String(l.feeCode ?? ''),
          description: String(l.description ?? ''),
          feeType: String(l.feeType ?? 'other'),
          quantity: Number(l.quantity ?? 1),
          unitAmount: Number(l.unitAmount ?? l.amount ?? 0),
          amount: Number(l.amount ?? 0),
        }))
      } else {
        const chargeLines = await AssessmentLine.query()
          .where('assessment_id', latestAssessment.id)
          .where('is_aid', false)
          .orderBy('created_at', 'asc')
        assessmentBreakdown = chargeLines.map((l) => ({
          feeCode: l.feeCode,
          description: l.description,
          feeType: l.feeType,
          quantity: Number(l.quantity),
          unitAmount: Number(l.unitAmount),
          amount: Number(l.amount),
        }))
      }
    }

    let minimumDueRequired: number | null = null
    let installments: Array<{
      sequence: number
      label: string
      amount: number
      paidAmount: number
      dueDate: string | null
      status: string
    }> = []

    if (latestAssessment?.assessmentNumber) {
      try {
        const ufms = await this.finance.getPaymentStatus({
          organizationId,
          assessmentNumber: latestAssessment.assessmentNumber,
        })
        minimumDueRequired =
          ufms.minimumDueRequired != null ? Number(ufms.minimumDueRequired) : null
        installments = (ufms.installments ?? []).map((i) => ({
          sequence: i.sequence,
          label: i.label,
          amount: Number(i.amount),
          paidAmount: Number(i.paidAmount),
          dueDate: i.dueDate,
          status: i.status,
        }))
        if (tuitionBalance && ufms.paidAmount != null) {
          tuitionBalance.paidAmount = Number(ufms.paidAmount)
          tuitionBalance.balanceAmount = Number(ufms.balanceAmount)
        }
      } catch {
        if (latestAssessment && tuitionBalance) {
          const policy = await enrollmentPaymentPolicyService.getPolicy(organizationId)
          minimumDueRequired = enrollmentPaymentPolicyService.computeMinimumDue({
            policy,
            netAmount: Number(latestAssessment.netAmount),
            installments: [],
          })
        }
      }
    }

    return {
      student: {
        id: student.id,
        studentNumber: student.studentNumber,
        firstName: student.firstName,
        lastName: student.lastName,
        email: student.email,
        classification: student.classification,
        status: student.status,
      },
      deficiencies: deficiencies.map((d) => ({
        id: d.id,
        requirementCode: d.requirementCode,
        description: d.description,
        status: d.status,
        createdAt: d.createdAt?.toISO() ?? null,
      })),
      openDeficiencyCount,
      assessmentBreakdown,
      tuitionBalance: tuitionBalance
        ? { ...tuitionBalance, minimumDueRequired }
        : null,
      paymentSchedule:
        installments.length > 0 || minimumDueRequired != null
          ? { minimumDueRequired, installments }
          : null,
      runningGrades: runningGrades.map((g) => ({
        id: g.id,
        courseCode: g.courseCode,
        courseTitle: g.courseTitle,
        units: Number(g.units),
        markCode: g.markCode,
        grade: g.grade,
        numericGrade: g.numericGrade,
        status: g.status,
        enrollmentId: g.enrollmentId,
      })),
      assessmentForms: assessmentForms.map((d) => ({
        id: d.id,
        documentNumber: d.documentNumber,
        enrollmentId: d.enrollmentId,
        assessmentId: d.assessmentId,
        qrToken: d.qrToken,
        issuedAt: d.issuedAt?.toISO() ?? null,
        snapshot: d.snapshot,
      })),
      latestAssessment: latestAssessment
        ? {
            id: latestAssessment.id,
            assessmentNumber: latestAssessment.assessmentNumber,
            enrollmentId: latestAssessment.enrollmentId,
            status: latestAssessment.status,
            netAmount: Number(latestAssessment.netAmount),
            paidAmount: Number(latestAssessment.paidAmount ?? 0),
            balanceAmount: Number(latestAssessment.balanceAmount ?? 0),
            ufmsPaymentStatus: latestAssessment.ufmsPaymentStatus,
            minimumDueRequired,
          }
        : null,
    }
  }

  async issueDocument(input: {
    organizationId: string
    enrollmentId: string
    docType: 'assessment_form' | 'certificate_of_registration'
    actorUserId: string
  }) {
    const enrollment = await Enrollment.query()
      .where('id', input.enrollmentId)
      .where('organization_id', input.organizationId)
      .preload('student')
      .preload('academicYear')
      .preload('section')
      .firstOrFail()

    if (input.docType === 'certificate_of_registration' && enrollment.status !== 'registered') {
      throw new EnrollmentWorkflowError(
        'Certificate of Registration requires official registration',
        422,
        'NOT_REGISTERED'
      )
    }

    const assessment = await Assessment.query().where('enrollment_id', enrollment.id).first()
    if (input.docType === 'assessment_form' && !assessment) {
      throw new EnrollmentWorkflowError('Assessment required before assessment form', 422, 'ASSESSMENT_REQUIRED')
    }

    const lines = await EnrollmentLine.query()
      .where('enrollment_id', enrollment.id)
      .whereNot('status', 'dropped')
    const assessmentLines = assessment
      ? await AssessmentLine.query().where('assessment_id', assessment.id)
      : []

    const documentNumber =
      input.docType === 'certificate_of_registration'
        ? `COR-${enrollment.id.slice(0, 8)}-${Date.now().toString(36).toUpperCase()}`
        : `AF-${assessment!.assessmentNumber}-${Date.now().toString(36).toUpperCase()}`

    const snapshot = {
      docType: input.docType,
      documentNumber,
      student: enrollment.student
        ? {
            id: enrollment.student.id,
            studentNumber: enrollment.student.studentNumber,
            name: `${enrollment.student.firstName} ${enrollment.student.lastName}`,
          }
        : null,
      enrollment: {
        id: enrollment.id,
        yearLevel: enrollment.yearLevel,
        semester: enrollment.semester,
        status: enrollment.status,
        classification: enrollment.classification,
        academicYear: enrollment.academicYear?.code ?? null,
        section: enrollment.section?.code ?? null,
      },
      subjects: lines.map((l) => ({
        code: l.subjectCode,
        title: l.subjectTitle,
        units: Number(l.units),
        sectionId: l.sectionId,
      })),
      assessment: assessment
        ? {
            id: assessment.id,
            assessmentNumber: assessment.assessmentNumber,
            tuitionFee: Number(assessment.tuitionFee),
            miscFees: Number(assessment.miscFees),
            discount: Number(assessment.discount),
            netAmount: Number(assessment.netAmount),
            unifastTagged: assessment.unifastTagged,
            ufmsAssessmentId: assessment.ufmsAssessmentId,
            lines: assessmentLines.map((l) => ({
              feeCode: l.feeCode,
              description: l.description,
              amount: Number(l.amount),
              isAid: l.isAid,
            })),
          }
        : null,
      issuedAt: DateTime.now().toISO(),
    }

    const qrToken = createHash('sha256')
      .update(`${input.docType}:${documentNumber}:${JSON.stringify(snapshot)}`)
      .digest('hex')
      .slice(0, 48)

    return RegistrationDocument.create({
      organizationId: input.organizationId,
      enrollmentId: enrollment.id,
      assessmentId: assessment?.id ?? null,
      docType: input.docType,
      documentNumber,
      qrToken,
      snapshot,
      issuedBy: input.actorUserId,
      issuedAt: DateTime.now(),
    })
  }

  async verifyDocumentQr(qrToken: string) {
    return RegistrationDocument.query().where('qr_token', qrToken).firstOrFail()
  }
}

export { randomUUID }
