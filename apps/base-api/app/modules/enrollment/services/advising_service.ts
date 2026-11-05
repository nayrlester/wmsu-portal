import db from '@adonisjs/lucid/services/db'
import { randomUUID } from 'node:crypto'
import { DateTime } from 'luxon'
import { t } from '#modules/enrollment/helpers/db_schema'
import Enrollment from '#modules/enrollment/models/enrollment'
import AdvisingSession from '#modules/enrollment/models/advising_session'
import AdvisingRecommendation from '#modules/enrollment/models/advising_recommendation'
import AdvisingPeriod from '#modules/enrollment/models/advising_period'
import AdvisingWaiver from '#modules/enrollment/models/advising_waiver'
import AdviserAssignment from '#modules/enrollment/models/adviser_assignment'
import EnrollmentLine from '#modules/enrollment/models/enrollment_line'
import Section from '#modules/enrollment/models/section'
import Subject from '#modules/enrollment/models/subject'
import Student from '#modules/enrollment/models/student'
import AuditLog from '#modules/enrollment/models/audit_log'
import { EnrollmentWorkflowError } from '#modules/enrollment/domain/enrollment_workflow'
import {
  evaluateCurriculum,
  validateEnrollmentLines,
} from '#modules/enrollment/services/enrollment_validation_service'

async function appendHistory(
  organizationId: string,
  enrollmentId: string,
  action: string,
  actorUserId: string | null,
  payload?: Record<string, unknown>,
  advisingSessionId?: string | null,
  trx?: any
) {
  const query = db.table(t('advising_history'))
  if (trx) query.useTransaction(trx)
  await query.insert({
    id: randomUUID(),
    organization_id: organizationId,
    enrollment_id: enrollmentId,
    advising_session_id: advisingSessionId ?? null,
    actor_user_id: actorUserId,
    action,
    payload: payload ? JSON.stringify(payload) : null,
    created_at: new Date(),
  })
}

async function transitionEnrollment(
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

export class AdvisingService {
  async upsertAdviserAssignment(input: {
    organizationId: string
    adviserUserId: string
    programId?: string | null
    yearLevel?: number | null
    sectionId?: string | null
    studentId?: string | null
    delegateUserId?: string | null
    actorUserId: string
  }) {
    const row = await AdviserAssignment.create({
      organizationId: input.organizationId,
      adviserUserId: input.adviserUserId,
      programId: input.programId ?? null,
      yearLevel: input.yearLevel ?? null,
      sectionId: input.sectionId ?? null,
      studentId: input.studentId ?? null,
      delegateUserId: input.delegateUserId ?? null,
      isActive: true,
      effectiveFrom: DateTime.now(),
    })
    await AuditLog.create({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: 'adviser.assign',
      entityType: 'adviser_assignments',
      entityId: row.id,
      metadata: input,
    })
    return row
  }

  async reassignAdviser(assignmentId: string, newAdviserUserId: string, actorUserId: string) {
    const row = await AdviserAssignment.findOrFail(assignmentId)
    row.isActive = false
    row.effectiveTo = DateTime.now()
    await row.save()
    return this.upsertAdviserAssignment({
      organizationId: row.organizationId,
      adviserUserId: newAdviserUserId,
      programId: row.programId,
      yearLevel: row.yearLevel,
      sectionId: row.sectionId,
      studentId: row.studentId,
      delegateUserId: row.delegateUserId,
      actorUserId,
    })
  }

  async ensureAdvisingPeriodOpen(organizationId: string, academicYearId: string, semester: number) {
    const period = await AdvisingPeriod.query()
      .where({ organization_id: organizationId, academic_year_id: academicYearId, semester })
      .first()
    if (!period) return
    if (!period.enforceCutoff) return
    const now = DateTime.now()
    if (now < period.startsAt || now > period.endsAt) {
      throw new EnrollmentWorkflowError('Advising period is closed', 409, 'ADVISING_PERIOD_CLOSED', {
        startsAt: period.startsAt.toISO(),
        endsAt: period.endsAt.toISO(),
      })
    }
  }

  async startSession(input: {
    organizationId: string
    enrollmentId: string
    adviserUserId: string
    mode: 'online' | 'face_to_face'
    onBehalf?: boolean
  }) {
    return db.transaction(async (trx) => {
      const enrollment = await Enrollment.query({ client: trx })
        .where('id', input.enrollmentId)
        .where('organization_id', input.organizationId)
        .forUpdate()
        .firstOrFail()

      if (['registered'].includes(enrollment.status)) {
        throw new EnrollmentWorkflowError('Cannot advise a registered enrollment', 409, 'ALREADY_REGISTERED')
      }

      await this.ensureAdvisingPeriodOpen(
        enrollment.organizationId,
        enrollment.academicYearId,
        enrollment.semester
      )

      const student = await Student.findOrFail(enrollment.studentId, { client: trx })
      const evaluation = await evaluateCurriculum({
        organizationId: enrollment.organizationId,
        studentId: student.id,
        programId: student.programId,
        yearLevel: enrollment.yearLevel,
      })

      const openSections = await Section.query({ client: trx })
        .where('organization_id', enrollment.organizationId)
        .where('academic_year_id', enrollment.academicYearId)
        .where('status', 'active')
        .where('semester', enrollment.semester)

      const eligible = evaluation.remaining.map((subject) => {
        const sections = openSections
          .filter((s) => s.subjectId === subject.id || s.programId === student.programId)
          .filter((s) => s.capacity == null || s.enrolledCount < s.capacity)
          .map((s) => ({ id: s.id, code: s.code, capacity: s.capacity, enrolledCount: s.enrolledCount }))
        return { ...subject, openSections: sections }
      })

      const session = await AdvisingSession.create(
        {
          organizationId: enrollment.organizationId,
          enrollmentId: enrollment.id,
          adviserUserId: input.adviserUserId,
          mode: input.mode,
          onBehalf: input.onBehalf ?? false,
          status: 'in_progress',
          curriculumEvaluation: {
            ...evaluation,
            eligibleSubjects: eligible,
          },
        },
        { client: trx }
      )

      enrollment.useTransaction(trx)
      await transitionEnrollment(enrollment, 'advising', input.adviserUserId, 'Advising session started', trx)
      await appendHistory(
        enrollment.organizationId,
        enrollment.id,
        'session.start',
        input.adviserUserId,
        { mode: input.mode, onBehalf: input.onBehalf ?? false },
        session.id,
        trx
      )

      return { session, evaluation: { ...evaluation, eligibleSubjects: eligible } }
    })
  }

  async addRecommendation(input: {
    organizationId: string
    sessionId: string
    actorUserId: string
    subjectCode: string
    subjectTitle?: string
    subjectId?: string | null
    units?: number
    sectionId?: string | null
    action?: string
    substitutesForSubjectId?: string | null
    notes?: string | null
  }) {
    const session = await AdvisingSession.query()
      .where('id', input.sessionId)
      .where('organization_id', input.organizationId)
      .firstOrFail()
    if (session.status !== 'in_progress') {
      throw new EnrollmentWorkflowError('Advising session is not editable', 409, 'SESSION_LOCKED')
    }

    let subjectId = input.subjectId ?? null
    let title = input.subjectTitle
    let units = input.units ?? 3
    if (!title || subjectId == null) {
      const subject = subjectId
        ? await Subject.find(subjectId)
        : await Subject.query()
            .where('organization_id', input.organizationId)
            .where('subject_code', input.subjectCode)
            .first()
      if (subject) {
        subjectId = subject.id
        title = subject.title
        units = subject.units
      }
    }

    const rec = await AdvisingRecommendation.create({
      organizationId: input.organizationId,
      advisingSessionId: session.id,
      subjectId,
      subjectCode: input.subjectCode,
      subjectTitle: title ?? input.subjectCode,
      units,
      sectionId: input.sectionId ?? null,
      action: input.action ?? 'recommend',
      substitutesForSubjectId: input.substitutesForSubjectId ?? null,
      notes: input.notes ?? null,
    })

    await appendHistory(
      input.organizationId,
      session.enrollmentId,
      'recommendation.add',
      input.actorUserId,
      { recommendationId: rec.id, subjectCode: rec.subjectCode, action: rec.action },
      session.id
    )
    return rec
  }

  async removeRecommendation(organizationId: string, recommendationId: string, actorUserId: string) {
    const rec = await AdvisingRecommendation.query()
      .where('id', recommendationId)
      .where('organization_id', organizationId)
      .firstOrFail()
    const session = await AdvisingSession.findOrFail(rec.advisingSessionId)
    if (session.status !== 'in_progress') {
      throw new EnrollmentWorkflowError('Advising session is not editable', 409, 'SESSION_LOCKED')
    }
    await rec.delete()
    await appendHistory(
      organizationId,
      session.enrollmentId,
      'recommendation.remove',
      actorUserId,
      { recommendationId, subjectCode: rec.subjectCode },
      session.id
    )
  }

  async endorseSession(input: {
    organizationId: string
    sessionId: string
    actorUserId: string
    remarks?: string | null
    overloadApproved?: boolean
    underloadApproved?: boolean
  }) {
    return db.transaction(async (trx) => {
      const session = await AdvisingSession.query({ client: trx })
        .where('id', input.sessionId)
        .where('organization_id', input.organizationId)
        .forUpdate()
        .firstOrFail()
      if (session.status !== 'in_progress') {
        throw new EnrollmentWorkflowError('Session already endorsed or cancelled', 409, 'SESSION_NOT_IN_PROGRESS')
      }

      const enrollment = await Enrollment.query({ client: trx })
        .where('id', session.enrollmentId)
        .forUpdate()
        .firstOrFail()
      const student = await Student.findOrFail(enrollment.studentId, { client: trx })
      const recommendations = await AdvisingRecommendation.query({ client: trx }).where(
        'advising_session_id',
        session.id
      )
      const activeRecs = recommendations.filter((r) => r.action !== 'remove')

      const validation = await validateEnrollmentLines({
        organizationId: enrollment.organizationId,
        enrollmentId: enrollment.id,
        studentId: student.id,
        lines: activeRecs.map((r) => ({
          subjectId: r.subjectId,
          subjectCode: r.subjectCode,
          units: Number(r.units),
          sectionId: r.sectionId,
        })),
        overloadApproved: input.overloadApproved ?? session.overloadApproved,
        underloadApproved: input.underloadApproved ?? session.underloadApproved,
        programId: student.programId,
        yearLevel: enrollment.yearLevel,
      })

      if (!validation.ok) {
        throw new EnrollmentWorkflowError('Cannot endorse advising with validation failures', 422, 'ADVISING_VALIDATION_FAILED', {
          issues: validation.issues,
        })
      }

      await EnrollmentLine.query({ client: trx }).where('enrollment_id', enrollment.id).delete()
      for (const r of activeRecs) {
        await EnrollmentLine.create(
          {
            organizationId: enrollment.organizationId,
            enrollmentId: enrollment.id,
            subjectId: r.subjectId,
            subjectCode: r.subjectCode,
            subjectTitle: r.subjectTitle,
            units: Number(r.units),
            sectionId: r.sectionId,
            status: 'planned',
          },
          { client: trx }
        )
      }

      session.useTransaction(trx)
      session.status = 'endorsed'
      session.remarks = input.remarks ?? session.remarks
      session.overloadApproved = input.overloadApproved ?? session.overloadApproved
      session.underloadApproved = input.underloadApproved ?? session.underloadApproved
      session.approvedUnits = validation.totalUnits
      session.endorsedAt = DateTime.now()
      await session.save()

      enrollment.useTransaction(trx)
      enrollment.advisedAt = DateTime.now()
      enrollment.advisedBy = input.actorUserId
      enrollment.approvedUnits = validation.totalUnits
      enrollment.requiresReadvising = false
      enrollment.validationSnapshot = { issues: [], totalUnits: validation.totalUnits }
      await transitionEnrollment(enrollment, 'advised', input.actorUserId, 'Advising endorsed', trx)

      await appendHistory(
        enrollment.organizationId,
        enrollment.id,
        'session.endorse',
        input.actorUserId,
        { approvedUnits: validation.totalUnits, recommendationCount: activeRecs.length },
        session.id,
        trx
      )

      return { session, enrollment, lines: activeRecs.length }
    })
  }

  async recordBlockWaiver(input: {
    organizationId: string
    enrollmentId: string
    authorizedBy: string
    authorityRole: string
    reason?: string | null
    effectiveTo?: string | null
  }) {
    return db.transaction(async (trx) => {
      const enrollment = await Enrollment.query({ client: trx })
        .where('id', input.enrollmentId)
        .where('organization_id', input.organizationId)
        .forUpdate()
        .firstOrFail()

      const registrarOverride = ['registrar', 'dean', 'chancellor', 'assessment_officer'].includes(
        input.authorityRole.trim().toLowerCase()
      )
      if (!enrollment.isRegularBlock && !registrarOverride) {
        throw new EnrollmentWorkflowError(
          'Advising waiver is only for configured block-sectioned regular enrollments (or registrar/dean override)',
          422,
          'WAIVER_NOT_APPLICABLE'
        )
      }

      const waiver = await AdvisingWaiver.updateOrCreate(
        { enrollmentId: enrollment.id },
        {
          organizationId: enrollment.organizationId,
          enrollmentId: enrollment.id,
          authorizedBy: input.authorizedBy,
          authorityRole: input.authorityRole,
          reason: input.reason ?? null,
          effectiveFrom: DateTime.now(),
          effectiveTo: input.effectiveTo ? DateTime.fromISO(input.effectiveTo) : null,
        },
        { client: trx }
      )

      enrollment.useTransaction(trx)
      enrollment.advisingWaived = true
      enrollment.advisingWaiverId = waiver.id
      enrollment.advisedAt = DateTime.now()
      enrollment.advisedBy = input.authorizedBy
      await transitionEnrollment(
        enrollment,
        'advised',
        input.authorizedBy,
        `Block advising waived by ${input.authorityRole}`,
        trx
      )

      await appendHistory(
        enrollment.organizationId,
        enrollment.id,
        'waiver.record',
        input.authorizedBy,
        {
          authorityRole: input.authorityRole,
          waiverId: waiver.id,
        },
        null,
        trx
      )

      return { waiver, enrollment }
    })
  }

  async advisingDashboard(organizationId: string, academicYearId?: string, semester?: number) {
    const q = Enrollment.query().where('organization_id', organizationId)
    if (academicYearId) q.where('academic_year_id', academicYearId)
    if (semester) q.where('semester', semester)
    const rows = await q
    const advised = rows.filter((r) =>
      ['advised', 'assessed', 'payment_verified', 'registered'].includes(r.status) || r.advisingWaived
    )
    const notAdvised = rows.filter((r) => !advised.includes(r))
    return {
      total: rows.length,
      advised: advised.length,
      notAdvised: notAdvised.length,
      completionRate: rows.length ? advised.length / rows.length : 0,
      requiresReadvising: rows.filter((r) => r.requiresReadvising).length,
    }
  }
}
