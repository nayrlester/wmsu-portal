import db from '@adonisjs/lucid/services/db'
import { randomUUID } from 'node:crypto'
import { DateTime } from 'luxon'
import Applicant from '#modules/enrollment/models/applicant'
import Student from '#modules/enrollment/models/student'
import Enrollment from '#modules/enrollment/models/enrollment'
import Assessment from '#modules/enrollment/models/assessment'
import GradeEntry from '#modules/enrollment/models/grade_entry'
import EnrollmentLine from '#modules/enrollment/models/enrollment_line'
import EnrollmentOverride from '#modules/enrollment/models/enrollment_override'
import EnrollmentChangeRequest from '#modules/enrollment/models/enrollment_change_request'
import AdvisingSession from '#modules/enrollment/models/advising_session'
import { StudentAccountService } from '#modules/enrollment/services/student_account_service'
import { RecordsGradesClient } from '#modules/enrollment/services/integrations/records_grades_client'
import { t } from '#modules/enrollment/helpers/db_schema'
import {
  EnrollmentWorkflowError,
  STUDENT_CLASSIFICATIONS,
  type OverrideType,
} from '#modules/enrollment/domain/enrollment_workflow'
import { validateEnrollmentLines } from '#modules/enrollment/services/enrollment_validation_service'
import { waitlistService } from '#modules/enrollment/services/waitlist_service'
import {
  assertAdvisingGate,
  assertAssessmentGate,
  assertPaymentGate,
  assertRegistrarGate,
  enrollmentStepEnabled,
} from '#modules/enrollment/services/enrollment_approval_policy_service'

async function statusHistory(
  enrollment: Enrollment,
  toStatus: string,
  actorUserId: string | null,
  notes?: string,
  trx?: any
) {
  const from = enrollment.status
  enrollment.status = toStatus
  await enrollment.save()
  const query = db.table(t('enrollment_status_history'))
  if (trx) query.useTransaction(trx)
  await query.insert({
    id: randomUUID(),
    organization_id: enrollment.organizationId,
    enrollment_id: enrollment.id,
    from_status: from,
    to_status: toStatus,
    actor_user_id: actorUserId,
    notes: notes ?? null,
    created_at: new Date(),
  })
}

const ENROLLMENT_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function resolveEnrollmentId(organizationId: string, ref: string) {
  const value = ref?.trim() ?? ''
  if (!value) {
    throw new EnrollmentWorkflowError(
      'Enter a student name, student number, or enrollment ID',
      422,
      'ENROLLMENT_REF_REQUIRED'
    )
  }

  if (ENROLLMENT_UUID.test(value)) {
    const row = await Enrollment.query()
      .where('organization_id', organizationId)
      .where('id', value)
      .first()
    if (row) return row.id

    const studentById = await Student.query()
      .where('organization_id', organizationId)
      .where('id', value)
      .whereNull('deleted_at')
      .first()
    if (studentById) {
      const enrollment = await Enrollment.query()
        .where('organization_id', organizationId)
        .where('student_id', studentById.id)
        .orderByRaw("case when status = 'registered' then 1 else 0 end")
        .orderBy('created_at', 'desc')
        .first()
      if (enrollment) return enrollment.id
      throw new EnrollmentWorkflowError(
        `No enrollment found for student ${studentById.studentNumber}`,
        404,
        'ENROLLMENT_NOT_FOUND'
      )
    }

    throw new EnrollmentWorkflowError('Enrollment not found', 404, 'ENROLLMENT_NOT_FOUND')
  }

  const student = await Student.query()
    .where('organization_id', organizationId)
    .whereRaw('LOWER(student_number) = ?', [value.toLowerCase()])
    .whereNull('deleted_at')
    .first()

  if (!student) {
    throw new EnrollmentWorkflowError(
      `No student or enrollment matches "${value}". Search by student name or student number.`,
      422,
      'ENROLLMENT_REF_INVALID'
    )
  }

  const enrollment = await Enrollment.query()
    .where('organization_id', organizationId)
    .where('student_id', student.id)
    .orderByRaw("case when status = 'registered' then 1 else 0 end")
    .orderBy('created_at', 'desc')
    .first()

  if (!enrollment) {
    throw new EnrollmentWorkflowError(
      `No enrollment found for student ${student.studentNumber}`,
      404,
      'ENROLLMENT_NOT_FOUND'
    )
  }

  return enrollment.id
}

export type AccountNotice = {
  sent: boolean
  to: string | null
  loginEmail: string
  provisioned: boolean
  provisionError: string | null
  reason: string | null
}

function portalLine() {
  const portal = process.env.USIS_PORTAL_URL?.trim() || process.env.ENROLLMENT_PORTAL_URL?.trim()
  return portal ? `Sign in at ${portal}.` : 'Sign in at the USiS student portal.'
}

async function sendAccountMail(input: {
  toEmail: string
  toName: string
  subject: string
  message: string
  channel: string
}): Promise<AccountNotice> {
  const { emailJsMailerService } = await import(
    '#modules/common-platform/services/emailjs_mailer_service'
  )
  const to = input.toEmail.trim()
  if (!to) {
    return {
      sent: false,
      to: null,
      loginEmail: '',
      provisioned: false,
      provisionError: null,
      reason: 'No email address is on the application',
    }
  }
  if (!emailJsMailerService.isConfigured()) {
    return {
      sent: false,
      to,
      loginEmail: '',
      provisioned: false,
      provisionError: null,
      reason: 'Email delivery is not configured',
    }
  }
  const result = await emailJsMailerService.send({
    toEmail: to,
    toName: input.toName,
    subject: input.subject,
    message: input.message,
    extraParams: { channel: input.channel },
  })
  return {
    sent: result.success,
    to,
    loginEmail: '',
    provisioned: false,
    provisionError: null,
    reason: result.success ? null : result.error || 'Email was not delivered',
  }
}

export class EnrollmentFlowService {
  private studentAccountService = new StudentAccountService()

  async admitApplicant(applicantId: string, studentNumber: string, organizationId: string) {
    const applicant = await Applicant.findOrFail(applicantId)
    const account = await this.studentAccountService.createStudent({
      organizationId,
      studentNumber,
      firstName: applicant.firstName,
      middleName: applicant.middleName,
      lastName: applicant.lastName,
      mobile: applicant.mobile,
      birthDate: applicant.birthDate ?? null,
      programId: applicant.programId,
      applicantId: applicant.id,
      classification: applicant.classification ?? 'new',
      mdmCampusId: applicant.mdmCampusId ?? null,
    })
    const previousStatus = applicant.status
    applicant.status = 'admitted'
    applicant.admittedAt = DateTime.now()
    await applicant.save()
    try {
      const { admissionEventsService } = await import(
        '#modules/enrollment/services/admission_events_service'
      )
      await admissionEventsService.recordStatusChange({
        organizationId,
        applicantId: applicant.id,
        fromStatus: previousStatus,
        toStatus: 'admitted',
        note: 'Converted to student record (ENR-003)',
      })
    } catch {
      /* status history is additive; admit must not fail if history table is unavailable */
    }
    const accountNotice = await this.sendAdmissionAccountEmail(applicant, account)
    return { student: account.student, applicant, accountNotice }
  }

  private async sendAdmissionAccountEmail(
    applicant: Applicant,
    account: {
      loginEmail: string
      temporaryPassword: string | null
      provisioned: boolean
      provisionError: string | null
      student: { studentNumber: string }
    }
  ): Promise<AccountNotice> {
    const name = `${applicant.firstName} ${applicant.lastName}`.trim()
    const lines = [`Hi ${name},`, '']
    if (account.provisioned) {
      lines.push(
        'The registrar admitted your application. You can continue enrollment using the sign-in details below.'
      )
    } else {
      lines.push(
        'The registrar admitted your application and created your student record.',
        'Your sign-in account is not ready yet. Contact the registrar before you try to sign in.'
      )
    }
    lines.push(
      `Student number: ${account.student.studentNumber}`,
      `Sign-in email: ${account.loginEmail}`
    )
    if (account.provisioned && account.temporaryPassword) {
      lines.push(`Temporary password: ${account.temporaryPassword}`)
      lines.push('Change this password after you sign in.')
    } else if (account.provisioned) {
      lines.push('This sign-in already exists. Use the password you already have. A new password was not issued.')
    }
    lines.push(portalLine(), '', 'WMSU Student Information')
    const notice = await sendAccountMail({
      toEmail: applicant.email,
      toName: name,
      subject: `WMSU student account — ${account.student.studentNumber}`,
      message: lines.join('\n'),
      channel: 'admission_account',
    })
    return {
      ...notice,
      loginEmail: account.loginEmail,
      provisioned: account.provisioned,
      provisionError: account.provisioned ? null : account.provisionError,
    }
  }

  async createEnrollment(input: {
    organizationId: string
    studentId: string
    academicYearId: string
    sectionId?: string | null
    yearLevel: number
    semester: number
    classification: string
    isRegularBlock?: boolean
    actorUserId: string
  }) {
    if (!STUDENT_CLASSIFICATIONS.includes(input.classification as (typeof STUDENT_CLASSIFICATIONS)[number])) {
      throw new EnrollmentWorkflowError('Invalid student classification', 422, 'INVALID_CLASSIFICATION')
    }

    return db.transaction(async (trx) => {
      const existing = await Enrollment.query({ client: trx })
        .where({
          student_id: input.studentId,
          academic_year_id: input.academicYearId,
          semester: input.semester,
        })
        .first()
      if (existing) {
        throw new EnrollmentWorkflowError('Enrollment already exists for this term', 409, 'DUPLICATE_ENROLLMENT')
      }

      const enrollment = await Enrollment.create(
        {
          organizationId: input.organizationId,
          studentId: input.studentId,
          academicYearId: input.academicYearId,
          sectionId: input.sectionId ?? null,
          yearLevel: input.yearLevel,
          semester: input.semester,
          classification: input.classification,
          isRegularBlock: input.isRegularBlock ?? false,
          status: 'draft',
        },
        { client: trx }
      )

      await db
        .table(t('enrollment_status_history'))
        .useTransaction(trx)
        .insert({
          id: randomUUID(),
          organization_id: input.organizationId,
          enrollment_id: enrollment.id,
          from_status: null,
          to_status: 'draft',
          actor_user_id: input.actorUserId,
          notes: 'Enrollment created',
          created_at: new Date(),
        })

      return enrollment
    })
  }

  /** @deprecated Prefer AdvisingService.endorseSession — kept for API compatibility */
  async advisingApprove(enrollmentId: string, adviserId: string): Promise<Enrollment> {
    const enrollment = await Enrollment.findOrFail(enrollmentId)
    if (!(enrollment.advisingWaived || enrollment.status === 'advised')) {
      const session = await AdvisingSession.query()
        .where('enrollment_id', enrollmentId)
        .where('status', 'endorsed')
        .orderBy('created_at', 'desc')
        .first()
      if (!session) {
        throw new EnrollmentWorkflowError(
          'Academic advising endorsement is required before assessment (ENR-017)',
          422,
          'ADVISING_REQUIRED'
        )
      }
    }
    enrollment.advisedAt = DateTime.now()
    enrollment.advisedBy = adviserId
    if (enrollment.status === 'draft' || enrollment.status === 'advising') {
      await statusHistory(enrollment, 'advised', adviserId, 'Legacy advise endpoint')
    }
    return enrollment
  }

  async assess(
    enrollmentId: string,
    assessorId: string,
    fees: { tuitionFee: number; miscFees: number; discount?: number; feeScheduleId?: string | null }
  ): Promise<Assessment> {
    const { AssessmentService } = await import('#modules/enrollment/services/assessment_service')
    const env = (await import('#start/env')).default
    const enrollment = await Enrollment.findOrFail(enrollmentId)
    const service = new AssessmentService()
    const prepared = await service.prepareAssessment({
      organizationId: enrollment.organizationId,
      enrollmentId,
      actorUserId: assessorId,
      feeScheduleId: fees.feeScheduleId,
      tuitionFee: fees.tuitionFee,
      miscFees: fees.miscFees,
      discount: fees.discount,
    })
    await statusHistory(prepared.enrollment, 'assessed', assessorId, 'Assessment prepared')

    const financeLive =
      Boolean(env.get('FINANCE_API_URL')?.trim()) &&
      process.env.FINANCE_MOCK !== 'true' &&
      env.get('FINANCE_MOCK') !== true
    if (financeLive) {
      const submitted = await service.submitToUfms({
        organizationId: enrollment.organizationId,
        assessmentId: prepared.assessment.id,
      })
      return submitted.assessment
    }

    return prepared.assessment
  }

  async verifyPayment(enrollmentId: string, actorUserId: string) {
    const env = (await import('#start/env')).default
    const devBypass =
      process.env.USIS_DEV_PAYMENT_BYPASS === 'true' ||
      env.get('USIS_DEV_PAYMENT_BYPASS') === true ||
      process.env.FINANCE_MOCK === 'true' ||
      env.get('FINANCE_MOCK') === true
    if (devBypass) {
      const enrollment = await Enrollment.findOrFail(enrollmentId)
      await assertAssessmentGate(enrollment)
      enrollment.paymentVerified = true
      enrollment.paymentVerifiedAt = DateTime.now()
      enrollment.paymentVerifiedBy = actorUserId
      enrollment.status = 'payment_verified'
      await enrollment.save()
      await statusHistory(enrollment, 'payment_verified', actorUserId, 'Dev payment bypass')
      return enrollment
    }
    const { AssessmentService } = await import('#modules/enrollment/services/assessment_service')
    const service = new AssessmentService()
    const enrollment = await service.verifyPaymentFromUfms(enrollmentId, actorUserId)
    await assertAssessmentGate(enrollment)
    await statusHistory(enrollment, 'payment_verified', actorUserId, 'Payment confirmed via UFMS')
    return enrollment
  }

  async approveRegistrar(enrollmentId: string, actorUserId: string): Promise<Enrollment> {
    const enrollment = await Enrollment.findOrFail(enrollmentId)
    if (enrollment.status === 'registered') {
      throw new EnrollmentWorkflowError('Enrollment already registered', 409, 'ALREADY_REGISTERED')
    }
    if (!(await enrollmentStepEnabled(enrollment.organizationId, 'registrar'))) {
      throw new EnrollmentWorkflowError(
        'Registrar approval step is disabled in academic policy (ENR-008)',
        422,
        'REGISTRAR_STEP_DISABLED'
      )
    }
    await assertAdvisingGate(enrollment)
    await assertAssessmentGate(enrollment)
    await assertPaymentGate(enrollment)

    enrollment.registrarApprovedAt = DateTime.now()
    enrollment.registrarApprovedBy = actorUserId
    await statusHistory(enrollment, 'registrar_approved', actorUserId, 'Registrar approved for registration')
    return enrollment
  }

  async register(enrollmentId: string, actorUserId?: string | null): Promise<Enrollment> {
    let newlyRegistered = false
    const enrollment = await db.transaction(async (trx) => {
      const row = await Enrollment.query({ client: trx }).where('id', enrollmentId).forUpdate().firstOrFail()

      if (row.status === 'registered') return row

      await assertAdvisingGate(row, trx)
      await assertAssessmentGate(row)
      await assertPaymentGate(row)
      await assertRegistrarGate(row)

      if (row.requiresReadvising || row.requiresReassessment) {
        throw new EnrollmentWorkflowError('Pending re-advising or re-assessment', 409, 'WORKFLOW_INCOMPLETE')
      }

      const lines = await EnrollmentLine.query({ client: trx }).where('enrollment_id', row.id)
      const student = await Student.findOrFail(row.studentId, { client: trx })
      const validation = await validateEnrollmentLines({
        organizationId: row.organizationId,
        enrollmentId: row.id,
        studentId: student.id,
        lines: lines.map((l) => ({
          subjectId: l.subjectId,
          subjectCode: l.subjectCode,
          units: Number(l.units),
          sectionId: l.sectionId,
        })),
        overloadApproved: true,
        underloadApproved: true,
        programId: student.programId,
        yearLevel: row.yearLevel,
      })
      const blocking = validation.issues.filter((i) => !['unit_load'].includes(i.type))
      if (blocking.length) {
        throw new EnrollmentWorkflowError('Registration blocked by validations', 422, 'ENROLLMENT_VALIDATION_FAILED', {
          issues: blocking,
        })
      }

      for (const line of lines) {
        line.useTransaction(trx)
        line.status = 'registered'
        await line.save()
      }

      row.useTransaction(trx)
      row.registeredAt = DateTime.now()
      row.validationSnapshot = { issues: validation.issues, totalUnits: validation.totalUnits }
      await statusHistory(row, 'registered', actorUserId ?? null, 'Officially registered', trx)
      newlyRegistered = true
      return row
    })
    if (!newlyRegistered) return enrollment
    const enrollmentNotice = await this.sendOfficialEnrollmentEmail(enrollment)
    return Object.assign(enrollment, { enrollmentNotice })
  }

  private async sendOfficialEnrollmentEmail(enrollment: Enrollment): Promise<AccountNotice> {
    const student = await Student.findOrFail(enrollment.studentId)
    const applicant = student.applicantId ? await Applicant.find(student.applicantId) : null
    const toEmail = applicant?.email?.trim() || student.email
    const name = `${student.firstName} ${student.lastName}`.trim()
    const message = [
      `Hi ${name},`,
      '',
      'You are officially enrolled.',
      `Student number: ${student.studentNumber}`,
      `Year level ${enrollment.yearLevel}, semester ${enrollment.semester}.`,
      'Sign in with your student account to view this registration.',
      portalLine(),
      '',
      'WMSU Student Information',
    ].join('\n')
    const notice = await sendAccountMail({
      toEmail,
      toName: name,
      subject: `WMSU official enrollment — ${student.studentNumber}`,
      message,
      channel: 'official_enrollment',
    })
    return { ...notice, loginEmail: student.email, provisioned: true, provisionError: null }
  }

  async reject(enrollmentId: string, actorUserId: string, reason: string) {
    const enrollment = await Enrollment.findOrFail(enrollmentId)
    if (enrollment.status === 'registered') {
      throw new EnrollmentWorkflowError('Cannot reject a registered enrollment', 409, 'ALREADY_REGISTERED')
    }
    enrollment.rejectionReason = reason
    await statusHistory(enrollment, 'rejected', actorUserId, reason)
    return enrollment
  }

  async markIncomplete(enrollmentId: string, actorUserId: string, reason: string) {
    const enrollment = await Enrollment.findOrFail(enrollmentId)
    enrollment.rejectionReason = reason
    await statusHistory(enrollment, 'incomplete', actorUserId, reason)
    return enrollment
  }

  async addOverride(input: {
    organizationId: string
    enrollmentId: string
    overrideType: OverrideType
    reason: string
    authorizedBy: string
  }) {
    const enrollment = await Enrollment.query()
      .where('id', input.enrollmentId)
      .where('organization_id', input.organizationId)
      .firstOrFail()
    return EnrollmentOverride.create({
      organizationId: enrollment.organizationId,
      enrollmentId: enrollment.id,
      overrideType: input.overrideType,
      reason: input.reason,
      authorizedBy: input.authorizedBy,
    })
  }

  async requestChange(input: {
    organizationId: string
    enrollmentId: string
    changeType: 'add' | 'drop' | 'change'
    actorUserId: string
    enrollmentLineId?: string | null
    subjectId?: string | null
    subjectCode?: string | null
    subjectTitle?: string | null
    units?: number | null
    fromSectionId?: string | null
    toSectionId?: string | null
  }) {
    const enrollment = await Enrollment.query()
      .where('id', input.enrollmentId)
      .where('organization_id', input.organizationId)
      .firstOrFail()

    const window = await db
      .from(t('enrollment_change_windows'))
      .where({
        organization_id: input.organizationId,
        academic_year_id: enrollment.academicYearId,
        semester: enrollment.semester,
        change_type: input.changeType,
      })
      .first()

    if (window) {
      const now = DateTime.now()
      const start = DateTime.fromJSDate(new Date(window.starts_at))
      const end = DateTime.fromJSDate(new Date(window.ends_at))
      if (now < start || now > end) {
        throw new EnrollmentWorkflowError('Change request outside configured deadline', 409, 'CHANGE_WINDOW_CLOSED')
      }
    }

    return EnrollmentChangeRequest.create({
      organizationId: input.organizationId,
      enrollmentId: enrollment.id,
      changeType: input.changeType,
      enrollmentLineId: input.enrollmentLineId ?? null,
      subjectId: input.subjectId ?? null,
      subjectCode: input.subjectCode ?? null,
      subjectTitle: input.subjectTitle ?? null,
      units: input.units ?? null,
      fromSectionId: input.fromSectionId ?? null,
      toSectionId: input.toSectionId ?? null,
      status: 'pending',
      requestedBy: input.actorUserId,
    })
  }

  async decideChange(input: {
    organizationId: string
    requestId: string
    approve: boolean
    actorUserId: string
    notes?: string | null
  }) {
    return db.transaction(async (trx) => {
      const req = await EnrollmentChangeRequest.query({ client: trx })
        .where('id', input.requestId)
        .where('organization_id', input.organizationId)
        .forUpdate()
        .firstOrFail()
      if (req.status !== 'pending') {
        throw new EnrollmentWorkflowError('Change request already decided', 409, 'CHANGE_ALREADY_DECIDED')
      }

      const enrollment = await Enrollment.query({ client: trx }).where('id', req.enrollmentId).forUpdate().firstOrFail()

      req.useTransaction(trx)
      req.status = input.approve ? 'approved' : 'rejected'
      req.decidedBy = input.actorUserId
      req.decidedAt = DateTime.now()
      req.decisionNotes = input.notes ?? null
      await req.save()

      if (!input.approve) return { request: req, enrollment }

      if (req.changeType === 'add') {
        await EnrollmentLine.create(
          {
            organizationId: enrollment.organizationId,
            enrollmentId: enrollment.id,
            subjectId: req.subjectId,
            subjectCode: req.subjectCode ?? 'TBD',
            subjectTitle: req.subjectTitle ?? 'TBD',
            units: Number(req.units ?? 3),
            sectionId: req.toSectionId,
            status: 'planned',
          },
          { client: trx }
        )
      } else if (req.changeType === 'drop' && req.enrollmentLineId) {
        const line = await EnrollmentLine.findOrFail(req.enrollmentLineId, { client: trx })
        line.useTransaction(trx)
        line.status = 'dropped'
        await line.save()
        if (line.sectionId) {
          await waitlistService.promoteNextIfSeatAvailable({
            organizationId: enrollment.organizationId,
            sectionId: line.sectionId,
            actorUserId: input.actorUserId,
            trx,
          })
        }
      } else if (req.changeType === 'change' && req.enrollmentLineId) {
        const line = await EnrollmentLine.findOrFail(req.enrollmentLineId, { client: trx })
        line.useTransaction(trx)
        if (req.toSectionId) line.sectionId = req.toSectionId
        if (req.subjectCode) line.subjectCode = req.subjectCode
        if (req.subjectTitle) line.subjectTitle = req.subjectTitle
        if (req.units != null) line.units = Number(req.units)
        await line.save()
      }

      enrollment.useTransaction(trx)
      enrollment.requiresReadvising = true
      enrollment.requiresReassessment = true
      enrollment.paymentVerified = false
      await statusHistory(
        enrollment,
        'requires_readvising',
        input.actorUserId,
        'Subject/schedule change approved — re-advise and reassess (ENR-017B/ENR-019)',
        trx
      )

      return { request: req, enrollment }
    })
  }

  async submitGrades(
    enrollmentId: string,
    grades: Array<{ courseCode: string; courseTitle: string; units: number; grade: number; remarks?: string }>,
    submitterId: string
  ): Promise<GradeEntry[]> {
    const enrollment = await Enrollment.query()
      .where('id', enrollmentId)
      .preload('student')
      .preload('academicYear')
      .firstOrFail()
    const entries: GradeEntry[] = []
    const now = DateTime.now()

    for (const g of grades) {
      const markCode = Number(g.grade).toFixed(2)
      const entry = await GradeEntry.create({
        organizationId: enrollment.organizationId,
        enrollmentId: enrollment.id,
        studentId: enrollment.studentId,
        courseCode: g.courseCode,
        courseTitle: g.courseTitle,
        units: g.units,
        grade: g.grade,
        markCode,
        numericGrade: g.grade,
        originalMarkCode: markCode,
        originalNumericGrade: g.grade,
        remarks: g.remarks,
        autoRemark: g.remarks ?? null,
        status: 'locked',
        submittedAt: now,
        submittedBy: submitterId,
        lockedAt: now,
        lockedBy: submitterId,
        enteredAt: now,
        enteredBy: submitterId,
      })
      entries.push(entry)
    }

    if (enrollment.student) {
      try {
        const records = new RecordsGradesClient()
        await records.syncGrades({
          organizationId: enrollment.organizationId,
          studentNumber: enrollment.student.studentNumber,
          grades: entries.map((e) => ({
            academicYear: enrollment.academicYear?.code ?? 'UNKNOWN',
            semester: enrollment.semester,
            courseCode: e.courseCode,
            courseTitle: e.courseTitle,
            units: e.units,
            grade: e.grade,
            remarks: e.remarks ?? null,
            sourceEntryId: e.id,
            originalGrade: e.originalNumericGrade ?? e.grade,
          })),
        })
      } catch {
        /* enrollment remains source of truth; TORMS consumes via authorized API */
      }
    }

    return entries
  }
}
