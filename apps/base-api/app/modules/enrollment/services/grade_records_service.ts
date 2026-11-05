import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import { EnrollmentWorkflowError } from '#modules/enrollment/domain/enrollment_workflow'
import {
  DEFAULT_GRADING_MARKS,
  GRADE_CORRECTION_REASON_CODES,
  type GradeMarkDefinition,
} from '#modules/enrollment/domain/grades'
import GradingScheme from '#modules/enrollment/models/grading_scheme'
import GradeDeadline from '#modules/enrollment/models/grade_deadline'
import FacultyClassAssignment from '#modules/enrollment/models/faculty_class_assignment'
import ClassRecord from '#modules/enrollment/models/class_record'
import GradeEntry from '#modules/enrollment/models/grade_entry'
import GradeSubmission from '#modules/enrollment/models/grade_submission'
import GradeCorrectionRequest from '#modules/enrollment/models/grade_correction_request'
import GradeCorrectionApproval from '#modules/enrollment/models/grade_correction_approval'
import GradeEntryHistory from '#modules/enrollment/models/grade_entry_history'
import GwaSnapshot from '#modules/enrollment/models/gwa_snapshot'
import AttendanceRecord from '#modules/enrollment/models/attendance_record'
import Section from '#modules/enrollment/models/section'
import Subject from '#modules/enrollment/models/subject'
import EnrollmentLine from '#modules/enrollment/models/enrollment_line'
import Student from '#modules/enrollment/models/student'
import { RecordsGradesClient } from '#modules/enrollment/services/integrations/records_grades_client'
import { resolveStudentGradeStatuses } from '#modules/enrollment/services/academic_policy_runtime_service'
import { academicPoliciesService } from '#modules/enrollment/services/academic_policies_service'
import { rowsToCsv, rowsToExcelXml, rowsToSimplePdf } from '#modules/enrollment/services/report_export'
import { auditLogService } from '#modules/enrollment/services/audit_log_service'
import { AuditAction } from '#modules/enrollment/domain/enums/index'

function round4(n: number) {
  return Math.round(n * 10000) / 10000
}

function marksOf(scheme: GradingScheme | null): GradeMarkDefinition[] {
  const fromScheme = scheme?.definitionJson?.marks
  return Array.isArray(fromScheme) && fromScheme.length ? fromScheme : DEFAULT_GRADING_MARKS
}

function resolveMark(scheme: GradingScheme | null, markCode: string): GradeMarkDefinition {
  const mark = marksOf(scheme).find((m) => m.code.toUpperCase() === markCode.toUpperCase())
  if (!mark) {
    throw new EnrollmentWorkflowError(`Unknown mark code ${markCode}`, 422, 'INVALID_MARK_CODE')
  }
  return mark
}

function autoRemark(mark: GradeMarkDefinition): string {
  return mark.remark
}

export class GradeRecordsService {
  async upsertGradingScheme(input: {
    organizationId: string
    code: string
    name: string
    marks?: GradeMarkDefinition[]
    failingMark?: number
    incConversionDays?: number
    isDefault?: boolean
  }) {
    if (input.isDefault) {
      await GradingScheme.query()
        .where('organization_id', input.organizationId)
        .update({ isDefault: false })
    }
    return GradingScheme.updateOrCreate(
      { organizationId: input.organizationId, code: input.code },
      {
        organizationId: input.organizationId,
        code: input.code,
        name: input.name,
        definitionJson: { marks: input.marks ?? DEFAULT_GRADING_MARKS },
        failingMark: input.failingMark ?? 5,
        incConversionDays: input.incConversionDays ?? 365,
        isActive: true,
        isDefault: input.isDefault ?? false,
        deletedAt: null,
      }
    )
  }

  async upsertGradeDeadline(input: {
    organizationId: string
    academicYearId: string
    semester: number
    encodeOpensAt?: string | null
    encodeClosesAt?: string | null
    submitDeadlineAt?: string | null
    setBy: string
  }) {
    return GradeDeadline.updateOrCreate(
      {
        organizationId: input.organizationId,
        academicYearId: input.academicYearId,
        semester: input.semester,
      },
      {
        organizationId: input.organizationId,
        academicYearId: input.academicYearId,
        semester: input.semester,
        encodeOpensAt: input.encodeOpensAt ? DateTime.fromISO(input.encodeOpensAt) : null,
        encodeClosesAt: input.encodeClosesAt ? DateTime.fromISO(input.encodeClosesAt) : null,
        submitDeadlineAt: input.submitDeadlineAt ? DateTime.fromISO(input.submitDeadlineAt) : null,
        setBy: input.setBy,
      }
    )
  }

  async assignFaculty(input: {
    organizationId: string
    sectionId: string
    facultyUserId: string
    academicYearId: string
    semester: number
    assignedBy: string
  }) {
    const section = await Section.query()
      .where('id', input.sectionId)
      .where('organization_id', input.organizationId)
      .firstOrFail()

    const assignment = await FacultyClassAssignment.updateOrCreate(
      {
        sectionId: input.sectionId,
        facultyUserId: input.facultyUserId,
        academicYearId: input.academicYearId,
        semester: input.semester,
      },
      {
        organizationId: input.organizationId,
        sectionId: input.sectionId,
        facultyUserId: input.facultyUserId,
        academicYearId: input.academicYearId,
        semester: input.semester,
        isActive: true,
        assignedBy: input.assignedBy,
        assignedAt: DateTime.now(),
      }
    )

    await this.ensureClassRecord({
      organizationId: input.organizationId,
      section,
      academicYearId: input.academicYearId,
      semester: input.semester,
      facultyUserId: input.facultyUserId,
    })

    return assignment
  }

  async ensureClassRecord(input: {
    organizationId: string
    section: Section
    academicYearId: string
    semester: number
    facultyUserId?: string | null
  }) {
    let subjectCode = input.section.code
    let subjectTitle = input.section.name
    let units = 0
    let subjectId = input.section.subjectId
    if (subjectId) {
      const subject = await Subject.find(subjectId)
      if (subject) {
        subjectCode = subject.subjectCode
        subjectTitle = subject.title
        units = Number(subject.units)
      }
    }

    const scheme = await GradingScheme.query()
      .where('organization_id', input.organizationId)
      .where('is_active', true)
      .whereNull('deleted_at')
      .orderBy('is_default', 'desc')
      .first()

    return ClassRecord.updateOrCreate(
      {
        sectionId: input.section.id,
        academicYearId: input.academicYearId,
        semester: input.semester,
      },
      {
        organizationId: input.organizationId,
        sectionId: input.section.id,
        academicYearId: input.academicYearId,
        semester: input.semester,
        subjectId,
        subjectCode,
        subjectTitle,
        units,
        gradingSchemeId: scheme?.id ?? null,
        facultyUserId: input.facultyUserId ?? null,
        status: 'open',
      }
    )
  }

  private async assertFacultyAuthorized(
    organizationId: string,
    classRecord: ClassRecord,
    facultyUserId: string,
    allowRegistrarBypass = false
  ) {
    if (allowRegistrarBypass) return
    const assignment = await FacultyClassAssignment.query()
      .where('organization_id', organizationId)
      .where('section_id', classRecord.sectionId)
      .where('faculty_user_id', facultyUserId)
      .where('academic_year_id', classRecord.academicYearId)
      .where('semester', classRecord.semester)
      .where('is_active', true)
      .first()
    if (!assignment && classRecord.facultyUserId !== facultyUserId) {
      throw new EnrollmentWorkflowError(
        'Faculty is not authorized for this class',
        403,
        'FACULTY_NOT_AUTHORIZED'
      )
    }
  }

  private async assertWithinDeadline(classRecord: ClassRecord, forSubmit: boolean) {
    const deadline = await GradeDeadline.query()
      .where('organization_id', classRecord.organizationId)
      .where('academic_year_id', classRecord.academicYearId)
      .where('semester', classRecord.semester)
      .first()
    if (!deadline) return
    const now = DateTime.now()
    if (deadline.encodeOpensAt && now < deadline.encodeOpensAt) {
      throw new EnrollmentWorkflowError('Grade encoding has not opened', 409, 'GRADE_WINDOW_CLOSED')
    }
    if (!forSubmit && deadline.encodeClosesAt && now > deadline.encodeClosesAt) {
      throw new EnrollmentWorkflowError('Grade encoding window closed', 409, 'GRADE_WINDOW_CLOSED')
    }
    if (forSubmit && deadline.submitDeadlineAt && now > deadline.submitDeadlineAt) {
      throw new EnrollmentWorkflowError('Grade submission deadline passed', 409, 'GRADE_DEADLINE_PASSED')
    }
  }

  async getClassMasterList(organizationId: string, classRecordId: string) {
    const record = await ClassRecord.query()
      .where('id', classRecordId)
      .where('organization_id', organizationId)
      .preload('section')
      .preload('academicYear')
      .preload('gradingScheme')
      .firstOrFail()

    const lines = await EnrollmentLine.query()
      .where('organization_id', organizationId)
      .where('section_id', record.sectionId)
      .whereNot('status', 'dropped')
      .preload('enrollment', (q) => q.preload('student'))

    const roster = lines
      .filter((l) => l.enrollment?.status === 'registered' || l.enrollment?.status === 'payment_verified')
      .map((l) => ({
        enrollmentLineId: l.id,
        enrollmentId: l.enrollmentId,
        studentId: l.enrollment.studentId,
        studentNumber: l.enrollment.student?.studentNumber,
        firstName: l.enrollment.student?.firstName,
        lastName: l.enrollment.student?.lastName,
        units: Number(l.units),
        subjectCode: l.subjectCode,
      }))

    const entries = await GradeEntry.query().where('class_record_id', record.id)
    return { classRecord: record, roster, entries }
  }

  async openOrSyncClassRecord(input: {
    organizationId: string
    sectionId: string
    academicYearId: string
    semester: number
    facultyUserId: string
  }) {
    const section = await Section.query()
      .where('id', input.sectionId)
      .where('organization_id', input.organizationId)
      .firstOrFail()
    const record = await this.ensureClassRecord({
      organizationId: input.organizationId,
      section,
      academicYearId: input.academicYearId,
      semester: input.semester,
      facultyUserId: input.facultyUserId,
    })
    await this.assertFacultyAuthorized(input.organizationId, record, input.facultyUserId)
    const master = await this.getClassMasterList(input.organizationId, record.id)
    for (const row of master.roster) {
      const existing = await GradeEntry.query()
        .where('class_record_id', record.id)
        .where('student_id', row.studentId)
        .first()
      if (existing) continue
      await GradeEntry.create({
        organizationId: input.organizationId,
        enrollmentId: row.enrollmentId,
        classRecordId: record.id,
        studentId: row.studentId,
        enrollmentLineId: row.enrollmentLineId,
        courseCode: record.subjectCode,
        courseTitle: record.subjectTitle,
        units: record.units || row.units,
        grade: null,
        markCode: null,
        numericGrade: null,
        status: 'draft',
        remarks: null,
      })
    }
    return this.getClassMasterList(input.organizationId, record.id)
  }

  async encodeGrades(input: {
    organizationId: string
    classRecordId: string
    facultyUserId: string
    allowRegistrarBypass?: boolean
    grades: Array<{
      studentId: string
      markCode: string
      rawScore?: number | null
    }>
  }) {
    const record = await ClassRecord.query()
      .where('id', input.classRecordId)
      .where('organization_id', input.organizationId)
      .preload('gradingScheme')
      .firstOrFail()

    if (record.status === 'locked' || record.status === 'submitted') {
      throw new EnrollmentWorkflowError(
        'Submitted grades are locked; use correction workflow',
        409,
        'GRADES_LOCKED'
      )
    }

    await this.assertFacultyAuthorized(
      input.organizationId,
      record,
      input.facultyUserId,
      input.allowRegistrarBypass
    )
    await this.assertWithinDeadline(record, false)

    const scheme = record.gradingScheme
    const updated: GradeEntry[] = []

    await db.transaction(async (trx) => {
      for (const g of input.grades) {
        const mark = resolveMark(scheme, g.markCode)
        let entry = await GradeEntry.query({ client: trx })
          .where('class_record_id', record.id)
          .where('student_id', g.studentId)
          .first()

        if (!entry) {
          const line = await EnrollmentLine.query({ client: trx })
            .where('section_id', record.sectionId)
            .whereHas('enrollment', (q) => q.where('student_id', g.studentId))
            .first()
          if (!line) {
            throw new EnrollmentWorkflowError(
              `Student ${g.studentId} is not on the class master list`,
              422,
              'STUDENT_NOT_IN_CLASS'
            )
          }
          entry = await GradeEntry.create(
            {
              organizationId: input.organizationId,
              enrollmentId: line.enrollmentId,
              classRecordId: record.id,
              studentId: g.studentId,
              enrollmentLineId: line.id,
              courseCode: record.subjectCode,
              courseTitle: record.subjectTitle,
              units: Number(record.units || line.units),
              status: 'draft',
            },
            { client: trx }
          )
        }

        if (entry.status === 'locked' || entry.status === 'submitted') {
          throw new EnrollmentWorkflowError('Grade entry is locked', 409, 'GRADE_ENTRY_LOCKED')
        }

        const oldMark = entry.markCode
        const oldNumeric = entry.numericGrade
        entry.useTransaction(trx)
        entry.markCode = mark.code
        entry.numericGrade = mark.numericEquivalent
        entry.grade = mark.numericEquivalent
        entry.rawScore = g.rawScore ?? entry.rawScore
        entry.remarks = autoRemark(mark)
        entry.autoRemark = autoRemark(mark)
        entry.enteredAt = DateTime.now()
        entry.enteredBy = input.facultyUserId
        entry.status = 'draft'
        if (mark.isIncomplete) {
          entry.incMarkedAt = entry.incMarkedAt ?? DateTime.now()
          entry.incConverted = false
        }
        await entry.save()

        await GradeEntryHistory.create(
          {
            organizationId: input.organizationId,
            gradeEntryId: entry.id,
            oldMarkCode: oldMark,
            oldNumericGrade: oldNumeric,
            newMarkCode: mark.code,
            newNumericGrade: mark.numericEquivalent,
            cause: 'encode',
            actorUserId: input.facultyUserId,
            meta: { rawScore: g.rawScore ?? null },
          },
          { client: trx }
        )
        updated.push(entry)
      }
    })

    return updated
  }

  async submitClassGrades(input: {
    organizationId: string
    classRecordId: string
    facultyUserId: string
    signatories?: Array<{ role: string; name: string }>
    allowRegistrarBypass?: boolean
  }) {
    const record = await ClassRecord.query()
      .where('id', input.classRecordId)
      .where('organization_id', input.organizationId)
      .preload('gradingScheme')
      .preload('academicYear')
      .firstOrFail()

    if (record.status === 'locked' || record.status === 'submitted') {
      throw new EnrollmentWorkflowError('Class grades already submitted and locked', 409, 'GRADES_LOCKED')
    }

    await this.assertFacultyAuthorized(
      input.organizationId,
      record,
      input.facultyUserId,
      input.allowRegistrarBypass
    )
    await this.assertWithinDeadline(record, true)

    const entries = await GradeEntry.query().where('class_record_id', record.id)
    if (!entries.length) {
      throw new EnrollmentWorkflowError('No grade entries to submit', 422, 'EMPTY_CLASS_RECORD')
    }
    const missing = entries.filter((e) => !e.markCode)
    if (missing.length) {
      throw new EnrollmentWorkflowError(
        'All students on the class record must have a mark before submission',
        422,
        'INCOMPLETE_ENCODING',
        { missingStudentIds: missing.map((m) => m.studentId) }
      )
    }

    return db.transaction(async (trx) => {
      const now = DateTime.now()
      for (const entry of entries) {
        entry.useTransaction(trx)
        if (!entry.originalMarkCode) {
          entry.originalMarkCode = entry.markCode
          entry.originalNumericGrade = entry.numericGrade
        }
        entry.status = 'locked'
        entry.submittedAt = now
        entry.submittedBy = input.facultyUserId
        entry.lockedAt = now
        entry.lockedBy = input.facultyUserId
        await entry.save()

        await GradeEntryHistory.create(
          {
            organizationId: input.organizationId,
            gradeEntryId: entry.id,
            oldMarkCode: entry.markCode,
            oldNumericGrade: entry.numericGrade,
            newMarkCode: entry.markCode,
            newNumericGrade: entry.numericGrade,
            cause: 'submit_lock',
            actorUserId: input.facultyUserId,
            meta: null,
          },
          { client: trx }
        )
      }

      let signatories = input.signatories?.filter((s) => s.role?.trim() && s.name?.trim()) ?? []
      if (!signatories.length) {
        const policy = await academicPoliciesService.getOrCreate(input.organizationId)
        signatories = (policy.gradeDocumentSignatories ?? [])
          .filter((s) => !s.docType || s.docType === 'grade_sheet' || s.docType === 'class_record')
          .map((s) => ({ role: s.role, name: s.name }))
      }

      record.useTransaction(trx)
      record.status = 'locked'
      record.submittedAt = now
      record.submittedBy = input.facultyUserId
      record.lockedAt = now
      if (signatories.length) record.signatoriesJson = signatories
      await record.save()

      const submission = await GradeSubmission.create(
        {
          organizationId: input.organizationId,
          classRecordId: record.id,
          submittedBy: input.facultyUserId,
          submittedAt: now,
          entryCount: entries.length,
          locked: true,
          payloadSnapshot: {
            subjectCode: record.subjectCode,
            entries: entries.map((e) => ({
              studentId: e.studentId,
              markCode: e.markCode,
              numericGrade: e.numericGrade,
              originalMarkCode: e.originalMarkCode,
            })),
          },
        },
        { client: trx }
      )

      return { classRecord: record, submission, entries }
    })
  }

  async requestCorrection(input: {
    organizationId: string
    gradeEntryId: string
    requestedBy: string
    reasonCode: string
    reasonNotes?: string | null
    supportingDocumentRefs?: string[]
    proposedMarkCode: string
    requiredLevels?: number
  }) {
    if (!GRADE_CORRECTION_REASON_CODES.includes(input.reasonCode as (typeof GRADE_CORRECTION_REASON_CODES)[number])) {
      throw new EnrollmentWorkflowError('Invalid correction reason code', 422, 'INVALID_REASON_CODE')
    }
    if (!input.supportingDocumentRefs?.length) {
      throw new EnrollmentWorkflowError(
        'Supporting documents are required for grade corrections',
        422,
        'SUPPORTING_DOCS_REQUIRED'
      )
    }

    const entry = await GradeEntry.query()
      .where('id', input.gradeEntryId)
      .where('organization_id', input.organizationId)
      .firstOrFail()

    if (entry.status !== 'locked' && entry.status !== 'submitted') {
      throw new EnrollmentWorkflowError(
        'Correction workflow applies only to submitted/locked grades',
        409,
        'GRADE_NOT_LOCKED'
      )
    }

    const pending = await GradeCorrectionRequest.query()
      .where('grade_entry_id', entry.id)
      .where('status', 'pending')
      .first()
    if (pending) {
      throw new EnrollmentWorkflowError('A pending correction already exists', 409, 'CORRECTION_PENDING')
    }

    const record = await ClassRecord.query().where('id', entry.classRecordId!).preload('gradingScheme').firstOrFail()
    const mark = resolveMark(record.gradingScheme, input.proposedMarkCode)

    return GradeCorrectionRequest.create({
      organizationId: input.organizationId,
      gradeEntryId: entry.id,
      classRecordId: record.id,
      requestedBy: input.requestedBy,
      reasonCode: input.reasonCode,
      reasonNotes: input.reasonNotes ?? null,
      supportingDocumentRefs: input.supportingDocumentRefs,
      proposedMarkCode: mark.code,
      proposedNumericGrade: mark.numericEquivalent,
      priorMarkCode: entry.markCode,
      priorNumericGrade: entry.numericGrade,
      status: 'pending',
      currentLevel: 0,
      requiredLevels: input.requiredLevels ?? 2,
    })
  }

  async decideCorrection(input: {
    organizationId: string
    requestId: string
    actorUserId: string
    approve: boolean
    notes?: string | null
    actorLevel?: number
  }) {
    return db.transaction(async (trx) => {
      const request = await GradeCorrectionRequest.query({ client: trx })
        .where('id', input.requestId)
        .where('organization_id', input.organizationId)
        .forUpdate()
        .firstOrFail()

      if (request.status !== 'pending') {
        throw new EnrollmentWorkflowError('Correction request already decided', 409, 'CORRECTION_DECIDED')
      }

      const nextLevel = request.currentLevel + 1
      if (input.actorLevel != null && input.actorLevel !== nextLevel) {
        throw new EnrollmentWorkflowError(
          `Approval required at level ${nextLevel}`,
          403,
          'WRONG_APPROVAL_LEVEL',
          { expectedLevel: nextLevel }
        )
      }

      await GradeCorrectionApproval.create(
        {
          organizationId: input.organizationId,
          requestId: request.id,
          level: nextLevel,
          actorUserId: input.actorUserId,
          decision: input.approve ? 'approved' : 'rejected',
          notes: input.notes ?? null,
          decidedAt: DateTime.now(),
        },
        { client: trx }
      )

      request.useTransaction(trx)
      request.currentLevel = nextLevel

      if (!input.approve) {
        request.status = 'rejected'
        request.decidedAt = DateTime.now()
        await request.save()
        return { request, applied: false }
      }

      if (nextLevel < request.requiredLevels) {
        await request.save()
        return { request, applied: false }
      }

      const entry = await GradeEntry.query({ client: trx }).where('id', request.gradeEntryId).forUpdate().firstOrFail()
      const oldMark = entry.markCode
      const oldNumeric = entry.numericGrade

      entry.useTransaction(trx)
      entry.markCode = request.proposedMarkCode
      entry.numericGrade = request.proposedNumericGrade
      entry.grade = request.proposedNumericGrade
      entry.remarks = request.proposedMarkCode
      entry.autoRemark = request.proposedMarkCode
      await entry.save()

      await GradeEntryHistory.create(
        {
          organizationId: input.organizationId,
          gradeEntryId: entry.id,
          oldMarkCode: oldMark,
          oldNumericGrade: oldNumeric,
          newMarkCode: request.proposedMarkCode,
          newNumericGrade: request.proposedNumericGrade,
          cause: 'correction_approved',
          actorUserId: input.actorUserId,
          meta: {
            requestId: request.id,
            reasonCode: request.reasonCode,
            originalMarkCode: entry.originalMarkCode,
            originalNumericGrade: entry.originalNumericGrade,
          },
        },
        { client: trx }
      )

      request.status = 'approved'
      request.decidedAt = DateTime.now()
      await request.save()
      return { request, applied: true, entry }
    })
  }

  async computeGwa(organizationId: string, studentId: string, academicYearId?: string, semester?: number) {
    const query = GradeEntry.query()
      .where('organization_id', organizationId)
      .where('student_id', studentId)
      .whereIn('status', ['submitted', 'locked'])
      .whereNotNull('numeric_grade')

    const all = await query
    const termEntries =
      academicYearId && semester
        ? (
            await Promise.all(
              all.map(async (e) => {
                if (!e.classRecordId) return null
                const cr = await ClassRecord.find(e.classRecordId)
                if (!cr) return null
                if (cr.academicYearId === academicYearId && cr.semester === semester) return e
                return null
              })
            )
          ).filter(Boolean)
        : all

    const weighted = (rows: GradeEntry[]) => {
      let points = 0
      let units = 0
      let earned = 0
      for (const r of rows) {
        const u = Number(r.units)
        const g = Number(r.numericGrade)
        if (!Number.isFinite(g) || !Number.isFinite(u) || u <= 0) continue
        points += g * u
        units += u
        if (g <= 3) earned += u
      }
      return {
        gwa: units > 0 ? round4(points / units) : null,
        unitsGraded: units,
        unitsEarned: earned,
      }
    }

    const term = weighted(termEntries as GradeEntry[])
    const cum = weighted(all)
    let standing: string | null = null
    if (cum.gwa != null) {
      if (cum.gwa <= 1.75) standing = 'dean_list_eligible'
      else if (cum.gwa <= 3) standing = 'good_standing'
      else standing = 'academic_warning'
    }

    const snapshot = await GwaSnapshot.create({
      organizationId,
      studentId,
      academicYearId: academicYearId ?? null,
      semester: semester ?? null,
      termGwa: term.gwa,
      cumulativeGwa: cum.gwa,
      unitsEarned: cum.unitsEarned,
      unitsGraded: cum.unitsGraded,
      academicStanding: standing,
      asOf: DateTime.now(),
    })
    return snapshot
  }

  async convertExpiredIncompletes(organizationId: string, actorUserId: string | null = null) {
    const schemes = await GradingScheme.query()
      .where('organization_id', organizationId)
      .where('is_active', true)
    const schemeById = new Map(schemes.map((s) => [s.id, s]))
    const defaultScheme =
      schemes.find((s) => s.isDefault) ?? schemes[0] ?? null

    const incompletes = await GradeEntry.query()
      .where('organization_id', organizationId)
      .whereIn('status', ['submitted', 'locked'])
      .where('inc_converted', false)
      .where((q) => q.where('mark_code', 'INC').orWhere('mark_code', 'inc'))

    const converted: GradeEntry[] = []
    for (const entry of incompletes) {
      if (!entry.incMarkedAt) continue
      let scheme = defaultScheme
      if (entry.classRecordId) {
        const cr = await ClassRecord.find(entry.classRecordId)
        if (cr?.gradingSchemeId) scheme = schemeById.get(cr.gradingSchemeId) ?? scheme
      }
      const days = scheme?.incConversionDays ?? 365
      const failing = Number(scheme?.failingMark ?? 5)
      const due = entry.incMarkedAt.plus({ days })
      if (DateTime.now() < due) continue

      const oldMark = entry.markCode
      const oldNumeric = entry.numericGrade
      entry.markCode = failing.toFixed(2)
      entry.numericGrade = failing
      entry.grade = failing
      entry.remarks = 'Failed'
      entry.autoRemark = 'Failed (INC converted)'
      entry.incConverted = true
      await entry.save()

      await GradeEntryHistory.create({
        organizationId,
        gradeEntryId: entry.id,
        oldMarkCode: oldMark,
        oldNumericGrade: oldNumeric,
        newMarkCode: entry.markCode,
        newNumericGrade: failing,
        cause: 'inc_auto_conversion',
        actorUserId,
        meta: { conversionDays: days, dueAt: due.toISO() },
      })
      converted.push(entry)
    }
    return converted
  }

  async gradeReport(organizationId: string, classRecordId: string) {
    const master = await this.getClassMasterList(organizationId, classRecordId)
    let signatories = master.classRecord.signatoriesJson ?? []
    if (!signatories.length) {
      const policy = await academicPoliciesService.getOrCreate(organizationId)
      signatories = (policy.gradeDocumentSignatories ?? [])
        .filter((s) => !s.docType || s.docType === 'grade_sheet' || s.docType === 'class_record')
        .map((s) => ({ role: s.role, name: s.name }))
    }
    return {
      classRecord: master.classRecord,
      students: master.roster.map((r) => {
        const entry = master.entries.find((e) => e.studentId === r.studentId)
        return {
          ...r,
          markCode: entry?.markCode ?? null,
          numericGrade: entry?.numericGrade ?? null,
          rawScore: entry?.rawScore ?? null,
          enteredAt: entry?.enteredAt?.toISO?.() ?? entry?.enteredAt ?? null,
          remarks: entry?.autoRemark ?? entry?.remarks ?? null,
          status: entry?.status ?? 'missing',
          originalMarkCode: entry?.originalMarkCode ?? null,
        }
      }),
      signatories,
    }
  }

  async exportGradeReport(input: {
    organizationId: string
    classRecordId: string
    format: 'csv' | 'xlsx' | 'pdf'
    actorUserId: string
  }) {
    const report = await this.gradeReport(input.organizationId, input.classRecordId)
    const record = report.classRecord as {
      id: string
      subjectCode?: string
      subjectTitle?: string
      status?: string
    }
    const rows = report.students.map((s) => ({
      studentNumber: (s as { studentNumber?: string }).studentNumber ?? '',
      lastName: (s as { lastName?: string }).lastName ?? '',
      firstName: (s as { firstName?: string }).firstName ?? '',
      rawScore: (s as { rawScore?: number | null }).rawScore ?? '',
      markCode: (s as { markCode?: string | null }).markCode ?? '',
      numericGrade: (s as { numericGrade?: number | null }).numericGrade ?? '',
      remarks: (s as { remarks?: string | null }).remarks ?? '',
      status: (s as { status?: string }).status ?? '',
      enteredAt: (s as { enteredAt?: string | null }).enteredAt ?? '',
    }))

    const title = `Grade sheet ${record.subjectCode ?? ''} — ${record.subjectTitle ?? ''}`.trim()
    const signatories = (report.signatories ?? []) as Array<{ role?: string; name?: string }>
    const footer = [
      `Class record: ${record.id}`,
      `Status: ${record.status ?? ''}`,
      'Signatories:',
      ...(signatories.length
        ? signatories.map((s) => `${s.role ?? 'Signatory'}: ${s.name ?? ''}`)
        : ['(none recorded — configure ENR-008 grade document signatories or enter on submit)']),
    ]

    await auditLogService.log({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: AuditAction.REPORT_EXPORT,
      entityType: 'class_record_grade_sheet',
      entityId: record.id,
      metadata: { format: input.format, studentCount: rows.length },
    })

    const slug = (record.subjectCode ?? 'class').replace(/[^a-zA-Z0-9_-]+/g, '_')
    if (input.format === 'csv') {
      const withFooter = [
        ...rows,
        {},
        { studentNumber: 'SIGNATORIES', lastName: '', firstName: '', rawScore: '', markCode: '', numericGrade: '', remarks: '', status: '', enteredAt: '' },
        ...signatories.map((s) => ({
          studentNumber: s.role ?? '',
          lastName: s.name ?? '',
          firstName: '',
          rawScore: '',
          markCode: '',
          numericGrade: '',
          remarks: '',
          status: '',
          enteredAt: '',
        })),
      ]
      return {
        contentType: 'text/csv; charset=utf-8',
        filename: `grade-sheet-${slug}.csv`,
        body: Buffer.from(rowsToCsv(withFooter), 'utf8'),
      }
    }
    if (input.format === 'xlsx') {
      const withFooter = [
        ...rows,
        {
          studentNumber: 'SIGNATORIES',
          lastName: '',
          firstName: '',
          rawScore: '',
          markCode: '',
          numericGrade: '',
          remarks: '',
          status: '',
          enteredAt: '',
        },
        ...signatories.map((s) => ({
          studentNumber: s.role ?? '',
          lastName: s.name ?? '',
          firstName: '',
          rawScore: '',
          markCode: '',
          numericGrade: '',
          remarks: '',
          status: '',
          enteredAt: '',
        })),
      ]
      return {
        contentType: 'application/vnd.ms-excel',
        filename: `grade-sheet-${slug}.xls`,
        body: Buffer.from(rowsToExcelXml(withFooter, 'GradeSheet'), 'utf8'),
      }
    }
    return {
      contentType: 'application/pdf',
      filename: `grade-sheet-${slug}.pdf`,
      body: rowsToSimplePdf(title, rows, footer),
    }
  }

  async academicRecordsForStudent(organizationId: string, studentId: string) {
    const student = await Student.query()
      .where('id', studentId)
      .where('organization_id', organizationId)
      .preload('program')
      .firstOrFail()

    const visibleStatuses = await resolveStudentGradeStatuses(organizationId)
    const entriesQuery = GradeEntry.query()
      .where('organization_id', organizationId)
      .where('student_id', studentId)
      .orderBy('created_at', 'asc')
    if (visibleStatuses) {
      entriesQuery.whereIn('status', visibleStatuses)
    } else {
      entriesQuery.whereIn('status', ['submitted', 'locked', 'draft', 'encoded'])
    }
    const entries = await entriesQuery.preload('enrollment', (q) => q.preload('academicYear'))

    const history = await GradeEntryHistory.query()
      .whereIn(
        'grade_entry_id',
        entries.map((e) => e.id)
      )
      .orderBy('created_at', 'asc')

    const gwa = await GwaSnapshot.query()
      .where('organization_id', organizationId)
      .where('student_id', studentId)
      .orderBy('as_of', 'desc')
      .first()

    return {
      student: {
        studentNumber: student.studentNumber,
        firstName: student.firstName,
        middleName: student.middleName,
        lastName: student.lastName,
        programCode: student.program?.code,
        programName: student.program?.name,
      },
      grades: entries.map((g) => ({
        id: g.id,
        academicYear: g.enrollment?.academicYear?.code,
        semester: g.enrollment?.semester,
        courseCode: g.courseCode,
        courseTitle: g.courseTitle,
        units: Number(g.units),
        markCode: g.markCode,
        grade: g.numericGrade ?? g.grade,
        remarks: g.autoRemark ?? g.remarks,
        originalMarkCode: g.originalMarkCode,
        originalGrade: g.originalNumericGrade,
        status: g.status,
        lockedAt: g.lockedAt,
      })),
      history,
      gwa,
    }
  }

  async listFacultyAssignments(organizationId: string, facultyUserId: string) {
    return FacultyClassAssignment.query()
      .where('organization_id', organizationId)
      .where('faculty_user_id', facultyUserId)
      .where('is_active', true)
      .preload('section')
      .preload('academicYear')
  }

  async recordAttendance(input: {
    organizationId: string
    classRecordId: string
    studentId: string
    sessionDate: string
    status: string
    notes?: string | null
    recordedBy: string
  }) {
    const sessionDate = DateTime.fromISO(input.sessionDate).startOf('day')
    const existing = await AttendanceRecord.query()
      .where('class_record_id', input.classRecordId)
      .where('student_id', input.studentId)
      .whereRaw('session_date = ?', [sessionDate.toISODate()])
      .first()
    if (existing) {
      existing.status = input.status
      existing.notes = input.notes ?? null
      existing.recordedBy = input.recordedBy
      await existing.save()
      return existing
    }
    return AttendanceRecord.create({
      organizationId: input.organizationId,
      classRecordId: input.classRecordId,
      studentId: input.studentId,
      sessionDate,
      status: input.status,
      notes: input.notes ?? null,
      recordedBy: input.recordedBy,
    })
  }

  async syncApprovedGradesToRecords(organizationId: string, studentId: string) {
    const payload = await this.academicRecordsForStudent(organizationId, studentId)
    try {
      const client = new RecordsGradesClient()
      await client.syncGrades({
        organizationId,
        studentNumber: payload.student.studentNumber,
        grades: payload.grades.map((g) => ({
          academicYear: g.academicYear ?? 'UNKNOWN',
          semester: g.semester ?? 1,
          courseCode: g.courseCode,
          courseTitle: g.courseTitle,
          units: g.units,
          grade: g.grade,
          remarks: g.remarks ?? null,
        })),
      })
      return { synced: true }
    } catch {
      return { synced: false }
    }
  }
}
