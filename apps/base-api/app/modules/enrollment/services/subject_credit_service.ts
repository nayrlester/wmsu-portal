import { DateTime } from 'luxon'
import { Exception } from '@adonisjs/core/exceptions'
import Student from '#modules/enrollment/models/student'
import Subject from '#modules/enrollment/models/subject'
import StudentSubjectCredit, {
  type SubjectCreditType,
} from '#modules/enrollment/models/student_subject_credit'
import UsisSubjectEquivalency from '#modules/enrollment/models/usis_subject_equivalency'
import { evaluateCurriculum } from '#modules/enrollment/services/enrollment_validation_service'
import { auditLogService } from '#modules/enrollment/services/audit_log_service'
import { AuditAction } from '#modules/enrollment/domain/enums/index'

function badRequest(message: string) {
  return new Exception(message, { status: 422, code: 'E_VALIDATION_FAILURE' })
}

export class SubjectCreditService {
  async listCredits(organizationId: string, studentId: string) {
    await Student.query()
      .where('organization_id', organizationId)
      .where('id', studentId)
      .firstOrFail()

    return StudentSubjectCredit.query()
      .where('organization_id', organizationId)
      .where('student_id', studentId)
      .orderBy('created_at', 'desc')
  }

  async evaluate(organizationId: string, studentId: string) {
    const student = await Student.query()
      .where('organization_id', organizationId)
      .where('id', studentId)
      .firstOrFail()

    return evaluateCurriculum({
      organizationId,
      studentId: student.id,
      programId: student.programId,
      yearLevel: student.yearLevel,
    })
  }

  async autoCreditInternal(organizationId: string, studentId: string, actorUserId: string) {
    const student = await Student.query()
      .where('organization_id', organizationId)
      .where('id', studentId)
      .firstOrFail()

    const evaluation = await evaluateCurriculum({
      organizationId,
      studentId: student.id,
      programId: student.programId,
      yearLevel: student.yearLevel,
    })

    const existing = await StudentSubjectCredit.query()
      .where('organization_id', organizationId)
      .where('student_id', studentId)
      .where('status', 'credited')
    const existingCodes = new Set(existing.map((c) => c.subjectCode.toUpperCase()))

    const created: StudentSubjectCredit[] = []
    for (const code of evaluation.passed) {
      const upper = code.toUpperCase()
      if (existingCodes.has(upper)) continue

      const subject = await Subject.query()
        .where('organization_id', organizationId)
        .whereILike('subject_code', code)
        .first()

      const row = await StudentSubjectCredit.create({
        organizationId,
        studentId,
        subjectId: subject?.id ?? null,
        subjectCode: subject?.subjectCode ?? code,
        subjectTitle: subject?.title ?? code,
        units: subject?.units ?? 0,
        creditType: 'internal',
        sourceSchool: null,
        status: 'credited',
        externalSubjectCode: null,
        externalSubjectTitle: null,
        notes: 'Auto-credited from passed internal grade (ENR-038)',
        reviewedBy: actorUserId,
        reviewedAt: DateTime.now(),
      })
      created.push(row)
      existingCodes.add(upper)
    }

    await auditLogService.log({
      organizationId,
      actorUserId,
      action: AuditAction.CREATE,
      entityType: 'student_subject_credit',
      entityId: studentId,
      metadata: { action: 'auto_internal', created: created.length },
    })

    return { created, evaluation }
  }

  async submitExternalCredit(
    organizationId: string,
    studentId: string,
    data: {
      externalSubjectCode: string
      externalSubjectTitle: string
      units: number
      sourceSchool?: string | null
      notes?: string | null
      mapToSubjectId?: string | null
    },
    actorUserId: string
  ) {
    await Student.query()
      .where('organization_id', organizationId)
      .where('id', studentId)
      .firstOrFail()

    let subject: Subject | null = null
    if (data.mapToSubjectId) {
      subject = await Subject.query()
        .where('organization_id', organizationId)
        .where('id', data.mapToSubjectId)
        .firstOrFail()
    }

    const equivalency = await UsisSubjectEquivalency.query()
      .where('organization_id', organizationId)
      .where('is_active', true)
      .whereILike('external_code', data.externalSubjectCode.trim())
      .if(data.sourceSchool, (q) =>
        q.where((b) =>
          b.whereNull('source_school').orWhereILike('source_school', data.sourceSchool!.trim())
        )
      )
      .preload('internalSubject')
      .first()

    if (!subject && equivalency?.internalSubject) {
      subject = equivalency.internalSubject
    }

    const creditType: SubjectCreditType = subject ? 'equivalent' : 'external'
    const status = subject ? 'credited' : 'pending'

    const row = await StudentSubjectCredit.create({
      organizationId,
      studentId,
      subjectId: subject?.id ?? null,
      subjectCode: subject?.subjectCode ?? data.externalSubjectCode.trim().toUpperCase(),
      subjectTitle: subject?.title ?? data.externalSubjectTitle.trim(),
      units: data.units,
      creditType,
      sourceSchool: data.sourceSchool?.trim() || null,
      status,
      externalSubjectCode: data.externalSubjectCode.trim().toUpperCase(),
      externalSubjectTitle: data.externalSubjectTitle.trim(),
      notes: data.notes?.trim() || null,
      reviewedBy: status === 'credited' ? actorUserId : null,
      reviewedAt: status === 'credited' ? DateTime.now() : null,
    })

    await auditLogService.log({
      organizationId,
      actorUserId,
      action: AuditAction.CREATE,
      entityType: 'student_subject_credit',
      entityId: row.id,
      metadata: { creditType, status, autoEquivalent: !!equivalency },
    })

    return row
  }

  async reviewCredit(
    organizationId: string,
    studentId: string,
    creditId: string,
    data: {
      decision: 'credited' | 'rejected'
      mapToSubjectId?: string | null
      notes?: string | null
    },
    actorUserId: string
  ) {
    const row = await StudentSubjectCredit.query()
      .where('organization_id', organizationId)
      .where('student_id', studentId)
      .where('id', creditId)
      .firstOrFail()

    if (row.status !== 'pending') throw badRequest('Only pending credit evaluations can be reviewed')

    if (data.decision === 'rejected') {
      row.status = 'rejected'
      row.notes = data.notes?.trim() || row.notes
      row.reviewedBy = actorUserId
      row.reviewedAt = DateTime.now()
      await row.save()
    } else {
      let subject: Subject | null = null
      if (data.mapToSubjectId) {
        subject = await Subject.query()
          .where('organization_id', organizationId)
          .where('id', data.mapToSubjectId)
          .firstOrFail()
      }
      if (subject) {
        row.subjectId = subject.id
        row.subjectCode = subject.subjectCode
        row.subjectTitle = subject.title
        row.units = subject.units
        row.creditType = 'equivalent'
      }
      row.status = 'credited'
      row.notes = data.notes?.trim() || row.notes
      row.reviewedBy = actorUserId
      row.reviewedAt = DateTime.now()
      await row.save()
    }

    await auditLogService.log({
      organizationId,
      actorUserId,
      action: AuditAction.UPDATE,
      entityType: 'student_subject_credit',
      entityId: row.id,
      metadata: { decision: data.decision },
    })
    return row
  }

  async listEquivalencies(organizationId: string) {
    return UsisSubjectEquivalency.query()
      .where('organization_id', organizationId)
      .preload('internalSubject')
      .orderBy('external_code', 'asc')
  }

  async createEquivalency(
    organizationId: string,
    data: {
      internalSubjectId: string
      externalCode: string
      externalTitle?: string | null
      sourceSchool?: string | null
    },
    actorUserId: string
  ) {
    await Subject.query()
      .where('organization_id', organizationId)
      .where('id', data.internalSubjectId)
      .firstOrFail()

    const row = await UsisSubjectEquivalency.create({
      organizationId,
      internalSubjectId: data.internalSubjectId,
      externalCode: data.externalCode.trim().toUpperCase(),
      externalTitle: data.externalTitle?.trim() || null,
      sourceSchool: data.sourceSchool?.trim() || null,
      isActive: true,
    })

    await auditLogService.log({
      organizationId,
      actorUserId,
      action: AuditAction.CREATE,
      entityType: 'usis_subject_equivalency',
      entityId: row.id,
    })
    return row
  }

  async applyEquivalencies(organizationId: string, studentId: string, actorUserId: string) {
    const pending = await StudentSubjectCredit.query()
      .where('organization_id', organizationId)
      .where('student_id', studentId)
      .where('status', 'pending')
      .where('credit_type', 'external')

    const updated: StudentSubjectCredit[] = []
    for (const row of pending) {
      const code = (row.externalSubjectCode || row.subjectCode || '').toUpperCase()
      if (!code) continue
      const match = await UsisSubjectEquivalency.query()
        .where('organization_id', organizationId)
        .where('is_active', true)
        .where('external_code', code)
        .preload('internalSubject')
        .first()
      if (!match?.internalSubject) continue

      row.subjectId = match.internalSubject.id
      row.subjectCode = match.internalSubject.subjectCode
      row.subjectTitle = match.internalSubject.title
      row.units = match.internalSubject.units
      row.creditType = 'equivalent'
      row.status = 'credited'
      row.reviewedBy = actorUserId
      row.reviewedAt = DateTime.now()
      row.notes = row.notes || `Auto-applied equivalency ${code} → ${match.internalSubject.subjectCode}`
      await row.save()
      updated.push(row)
    }

    await auditLogService.log({
      organizationId,
      actorUserId,
      action: AuditAction.UPDATE,
      entityType: 'student_subject_credit',
      entityId: studentId,
      metadata: { action: 'apply_equivalencies', updated: updated.length },
    })

    return updated
  }
}

export const subjectCreditService = new SubjectCreditService()
