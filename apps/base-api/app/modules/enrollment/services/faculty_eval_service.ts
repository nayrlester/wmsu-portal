import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import Student from '#modules/enrollment/models/student'
import FacultyClassAssignment from '#modules/enrollment/models/faculty_class_assignment'
import ClassRecord from '#modules/enrollment/models/class_record'
import UsisFacultyEvalCode from '#modules/enrollment/models/usis_faculty_eval_code'
import UsisFacultyEvalQuestion from '#modules/enrollment/models/usis_faculty_eval_question'
import UsisFacultyEvalSchedule from '#modules/enrollment/models/usis_faculty_eval_schedule'
import UsisFacultyEvalTarget from '#modules/enrollment/models/usis_faculty_eval_target'
import UsisFacultyEvalResponse from '#modules/enrollment/models/usis_faculty_eval_response'
import { t } from '#modules/enrollment/helpers/db_schema'
import { auditLogService } from '#modules/enrollment/services/audit_log_service'
import { AuditAction } from '#modules/enrollment/domain/enums/index'
import { rowsToCsv, rowsToExcelXml, rowsToSimplePdf } from '#modules/enrollment/services/report_export'
import { EnrollmentWorkflowError } from '#modules/enrollment/domain/enrollment_workflow'

function scheduleIsOpen(row: UsisFacultyEvalSchedule, now: DateTime) {
  if (row.status !== 'open') return false
  if (row.opensAt && row.opensAt > now) return false
  if (row.closesAt && row.closesAt <= now) return false
  return true
}

export class FacultyEvalService {
  async resolveStudent(organizationId: string, email: string) {
    const normalized = email.toLowerCase().trim()
    return Student.query().where('organization_id', organizationId).whereRaw('LOWER(email) = ?', [normalized]).first()
  }

  listCodes(organizationId: string) {
    return UsisFacultyEvalCode.query().where('organization_id', organizationId).orderBy('code', 'asc')
  }

  async createCode(input: { organizationId: string; code: string; name: string; description?: string | null }) {
    const row = await UsisFacultyEvalCode.create({
      organizationId: input.organizationId,
      code: input.code.trim().toUpperCase(),
      name: input.name.trim(),
      description: input.description ?? null,
      isActive: true,
    })
    await auditLogService.log({
      organizationId: input.organizationId,
      action: AuditAction.CREATE,
      entityType: 'faculty_eval_code',
      entityId: row.id,
    })
    return row
  }

  listQuestions(organizationId: string) {
    return UsisFacultyEvalQuestion.query()
      .where('organization_id', organizationId)
      .where('is_active', true)
      .orderBy('sort_order', 'asc')
      .orderBy('created_at', 'asc')
  }

  async createQuestion(input: {
    organizationId: string
    prompt: string
    code?: string | null
    questionType?: string
    sortOrder?: number
  }) {
    const row = await UsisFacultyEvalQuestion.create({
      organizationId: input.organizationId,
      prompt: input.prompt.trim(),
      code: input.code?.trim() ?? null,
      questionType: input.questionType ?? 'likert',
      sortOrder: input.sortOrder ?? 0,
      isActive: true,
    })
    await auditLogService.log({
      organizationId: input.organizationId,
      action: AuditAction.CREATE,
      entityType: 'faculty_eval_question',
      entityId: row.id,
    })
    return row
  }

  listSchedules(organizationId: string, page: number, limit: number) {
    return UsisFacultyEvalSchedule.query()
      .where('organization_id', organizationId)
      .preload('evalCode')
      .preload('targets', (q) => q.preload('faculty').preload('section'))
      .orderBy('created_at', 'desc')
      .paginate(page, limit)
  }

  async createSchedule(input: {
    organizationId: string
    userId: string
    evalCodeId: string
    title: string
    questionIds: string[]
    opensAt?: Date | null
    closesAt?: Date | null
    openNow?: boolean
    targets: Array<{ facultyUserId: string; sectionId: string | null; subjectCode?: string; subjectTitle?: string }>
  }) {
    const now = DateTime.now()
    const opensAt = input.opensAt ? DateTime.fromJSDate(input.opensAt) : input.openNow ? now : null
    const status = input.openNow || (opensAt && opensAt <= now) ? 'open' : 'draft'

    const schedule = await UsisFacultyEvalSchedule.create({
      organizationId: input.organizationId,
      evalCodeId: input.evalCodeId,
      title: input.title.trim(),
      questionIds: input.questionIds,
      opensAt,
      closesAt: input.closesAt ? DateTime.fromJSDate(input.closesAt) : null,
      status,
      createdBy: input.userId,
    })

    for (const target of input.targets) {
      await UsisFacultyEvalTarget.create({
        organizationId: input.organizationId,
        scheduleId: schedule.id,
        facultyUserId: target.facultyUserId,
        sectionId: target.sectionId,
        subjectCode: target.subjectCode ?? null,
        subjectTitle: target.subjectTitle ?? null,
      })
    }

    await auditLogService.log({
      organizationId: input.organizationId,
      actorUserId: input.userId,
      action: AuditAction.CREATE,
      entityType: 'faculty_eval_schedule',
      entityId: schedule.id,
    })

    return schedule
  }

  async openSchedule(id: string, organizationId: string, userId: string) {
    const schedule = await UsisFacultyEvalSchedule.query()
      .where('id', id)
      .where('organization_id', organizationId)
      .firstOrFail()
    const now = DateTime.now()
    schedule.status = 'open'
    if (!schedule.opensAt || schedule.opensAt > now) schedule.opensAt = now
    if (schedule.closesAt && schedule.closesAt <= now) schedule.closesAt = null
    await schedule.save()
    await auditLogService.log({
      organizationId,
      actorUserId: userId,
      action: AuditAction.UPDATE,
      entityType: 'faculty_eval_schedule',
      entityId: schedule.id,
      metadata: { status: 'open', closesAtCleared: schedule.closesAt === null },
    })
    return schedule
  }

  async closeSchedule(
    id: string,
    organizationId: string,
    userId: string,
    closesAt?: Date | null
  ) {
    const schedule = await UsisFacultyEvalSchedule.query()
      .where('id', id)
      .where('organization_id', organizationId)
      .firstOrFail()
    if (schedule.status === 'closed') {
      throw new EnrollmentWorkflowError('Schedule already closed', 409, 'SCHEDULE_CLOSED')
    }
    schedule.status = 'closed'
    schedule.closesAt = closesAt ? DateTime.fromJSDate(closesAt) : DateTime.now()
    await schedule.save()
    await auditLogService.log({
      organizationId,
      actorUserId: userId,
      action: AuditAction.UPDATE,
      entityType: 'faculty_eval_schedule',
      entityId: schedule.id,
      metadata: { status: 'closed', closesAt: schedule.closesAt?.toISO() ?? null },
    })
    return schedule
  }

  async setScheduleWindow(
    id: string,
    organizationId: string,
    userId: string,
    patch: { opensAt?: Date | null; closesAt?: Date | null; status?: 'draft' | 'open' | 'closed' }
  ) {
    const schedule = await UsisFacultyEvalSchedule.query()
      .where('id', id)
      .where('organization_id', organizationId)
      .firstOrFail()
    if (patch.opensAt !== undefined) {
      schedule.opensAt = patch.opensAt ? DateTime.fromJSDate(patch.opensAt) : null
    }
    if (patch.closesAt !== undefined) {
      schedule.closesAt = patch.closesAt ? DateTime.fromJSDate(patch.closesAt) : null
    }
    if (patch.status !== undefined) schedule.status = patch.status
    await schedule.save()
    await auditLogService.log({
      organizationId,
      actorUserId: userId,
      action: AuditAction.UPDATE,
      entityType: 'faculty_eval_schedule',
      entityId: schedule.id,
      metadata: {
        opensAt: schedule.opensAt?.toISO() ?? null,
        closesAt: schedule.closesAt?.toISO() ?? null,
        status: schedule.status,
      },
    })
    return schedule
  }

  async listAssignmentOptions(organizationId: string) {
    const assignments = await FacultyClassAssignment.query()
      .where('organization_id', organizationId)
      .where('is_active', true)
      .preload('section')
      .preload('faculty')
      .limit(200)

    if (assignments.length) {
      return assignments.map((a) => ({
        facultyUserId: a.facultyUserId,
        facultyName: a.faculty?.fullName ?? a.faculty?.email ?? a.facultyUserId,
        sectionId: a.sectionId,
        sectionCode: a.section?.code ?? null,
        sectionName: a.section?.name ?? null,
      }))
    }

    const records = await ClassRecord.query()
      .where('organization_id', organizationId)
      .preload('faculty')
      .limit(200)
    return records.map((r) => ({
      facultyUserId: r.facultyUserId,
      facultyName: r.faculty?.fullName ?? r.faculty?.email ?? 'Faculty',
      sectionId: r.sectionId,
      sectionCode: r.subjectCode,
      sectionName: r.subjectTitle,
      subjectCode: r.subjectCode,
      subjectTitle: r.subjectTitle,
    }))
  }

  async pendingForStudent(organizationId: string, student: Student) {
    const now = DateTime.now()
    const schedules = await UsisFacultyEvalSchedule.query()
      .where('organization_id', organizationId)
      .where('status', 'open')
      .preload('evalCode')
      .preload('targets', (q) => q.preload('faculty').preload('section'))

    const sectionIds = await db
      .from(t('enrollment_lines'))
      .join(t('enrollments'), `${t('enrollments')}.id`, `${t('enrollment_lines')}.enrollment_id`)
      .where(`${t('enrollments')}.student_id`, student.id)
      .where(`${t('enrollments')}.organization_id`, organizationId)
      .whereIn(`${t('enrollment_lines')}.status`, ['registered', 'enrolled'])
      .whereNotNull(`${t('enrollment_lines')}.section_id`)
      .select(`${t('enrollment_lines')}.section_id as section_id`)

    const allowedSections = new Set(sectionIds.map((r) => r.section_id as string))

    const completed = await UsisFacultyEvalResponse.query()
      .where('organization_id', organizationId)
      .where('student_id', student.id)
      .select('target_id')
    const doneTargets = new Set(completed.map((r) => r.targetId))

    const questionIds = new Set<string>()
    const items: Array<{
      targetId: string
      scheduleId: string
      scheduleTitle: string
      evalCode: string
      facultyName: string
      sectionLabel: string
      subjectCode: string | null
      questionIds: string[]
    }> = []

    for (const schedule of schedules) {
      if (!scheduleIsOpen(schedule, now)) continue
      for (const target of schedule.targets) {
        if (target.sectionId && !allowedSections.has(target.sectionId)) continue
        if (doneTargets.has(target.id)) continue
        for (const qid of schedule.questionIds) questionIds.add(qid)
        items.push({
          targetId: target.id,
          scheduleId: schedule.id,
          scheduleTitle: schedule.title,
          evalCode: schedule.evalCode?.code ?? '',
          facultyName: target.faculty?.fullName ?? target.faculty?.email ?? 'Faculty',
          sectionLabel: target.section?.code ?? target.section?.name ?? 'Section',
          subjectCode: target.subjectCode,
          questionIds: schedule.questionIds,
        })
      }
    }

    const questions = questionIds.size
      ? await UsisFacultyEvalQuestion.query().whereIn('id', [...questionIds]).orderBy('sort_order', 'asc')
      : []

    return { items, questions }
  }

  async submitResponse(input: {
    organizationId: string
    student: Student
    targetId: string
    answers: Record<string, number | string>
  }) {
    const target = await UsisFacultyEvalTarget.query()
      .where('id', input.targetId)
      .where('organization_id', input.organizationId)
      .preload('schedule', (q) => q.preload('evalCode'))
      .firstOrFail()

    const now = DateTime.now()
    if (!scheduleIsOpen(target.schedule, now)) {
      throw new Error('Evaluation period is not open')
    }

    if (target.sectionId) {
      const match = await db
        .from(t('enrollment_lines'))
        .join(t('enrollments'), `${t('enrollments')}.id`, `${t('enrollment_lines')}.enrollment_id`)
        .where(`${t('enrollments')}.student_id`, input.student.id)
        .where(`${t('enrollment_lines')}.section_id`, target.sectionId)
        .whereIn(`${t('enrollment_lines')}.status`, ['registered', 'enrolled'])
        .first()
      if (!match) throw new Error('You are not enrolled in this section')
    }

    const existing = await UsisFacultyEvalResponse.query()
      .where('target_id', input.targetId)
      .where('student_id', input.student.id)
      .first()
    if (existing) throw new Error('You already submitted this evaluation')

    for (const qid of target.schedule.questionIds) {
      if (input.answers[qid] === undefined || input.answers[qid] === '') {
        throw new Error('All questions must be answered')
      }
    }

    const row = await UsisFacultyEvalResponse.create({
      organizationId: input.organizationId,
      scheduleId: target.scheduleId,
      targetId: target.id,
      studentId: input.student.id,
      answers: input.answers,
      submittedAt: now,
    })

    await auditLogService.log({
      organizationId: input.organizationId,
      action: AuditAction.CREATE,
      entityType: 'faculty_eval_response',
      entityId: row.id,
      metadata: { scheduleId: target.scheduleId, targetId: target.id },
    })

    return row
  }

  async reportForSchedule(scheduleId: string, organizationId: string) {
    const schedule = await UsisFacultyEvalSchedule.query()
      .where('id', scheduleId)
      .where('organization_id', organizationId)
      .preload('evalCode')
      .preload('targets', (q) => q.preload('faculty').preload('section'))
      .firstOrFail()

    const questions = schedule.questionIds.length
      ? await UsisFacultyEvalQuestion.query().whereIn('id', schedule.questionIds).orderBy('sort_order', 'asc')
      : []

    const responses = await UsisFacultyEvalResponse.query()
      .where('schedule_id', scheduleId)
      .where('organization_id', organizationId)

    const byTarget = new Map<
      string,
      { responseCount: number; questionStats: Record<string, { sum: number; count: number; average: number }> }
    >()

    for (const target of schedule.targets) {
      byTarget.set(target.id, { responseCount: 0, questionStats: {} })
    }

    for (const response of responses) {
      const bucket = byTarget.get(response.targetId)
      if (!bucket) continue
      bucket.responseCount += 1
      for (const [qid, raw] of Object.entries(response.answers)) {
        if (typeof raw !== 'number') continue
        if (!bucket.questionStats[qid]) bucket.questionStats[qid] = { sum: 0, count: 0, average: 0 }
        bucket.questionStats[qid].sum += raw
        bucket.questionStats[qid].count += 1
        bucket.questionStats[qid].average = bucket.questionStats[qid].sum / bucket.questionStats[qid].count
      }
    }

    const targets = schedule.targets.map((target) => ({
      targetId: target.id,
      facultyName: target.faculty?.fullName ?? target.faculty?.email ?? target.facultyUserId,
      sectionLabel: target.section?.code ?? target.section?.name ?? null,
      subjectCode: target.subjectCode,
      ...(byTarget.get(target.id) ?? { responseCount: 0, questionStats: {} }),
    }))

    return {
      schedule: {
        id: schedule.id,
        title: schedule.title,
        status: schedule.status,
        evalCode: schedule.evalCode?.code ?? null,
        opensAt: schedule.opensAt?.toISO() ?? null,
        closesAt: schedule.closesAt?.toISO() ?? null,
      },
      questions: questions.map((q) => ({ id: q.id, prompt: q.prompt, questionType: q.questionType })),
      targets,
      totalResponses: responses.length,
      anonymity: 'Aggregates only — student identities are not included in faculty evaluation reports (ENR-050)',
    }
  }

  async exportReport(input: {
    organizationId: string
    scheduleId: string
    format: 'csv' | 'xlsx' | 'pdf'
    actorUserId: string
  }) {
    const report = await this.reportForSchedule(input.scheduleId, input.organizationId)
    const rows: Record<string, unknown>[] = []
    for (const target of report.targets) {
      for (const question of report.questions) {
        const stats = target.questionStats[question.id]
        rows.push({
          schedule: report.schedule.title,
          evalCode: report.schedule.evalCode ?? '',
          faculty: target.facultyName,
          section: target.sectionLabel ?? '',
          subjectCode: target.subjectCode ?? '',
          responses: target.responseCount,
          question: question.prompt,
          average: stats ? Math.round(stats.average * 100) / 100 : '',
          ratingCount: stats?.count ?? 0,
        })
      }
      if (!report.questions.length) {
        rows.push({
          schedule: report.schedule.title,
          evalCode: report.schedule.evalCode ?? '',
          faculty: target.facultyName,
          section: target.sectionLabel ?? '',
          subjectCode: target.subjectCode ?? '',
          responses: target.responseCount,
          question: '',
          average: '',
          ratingCount: 0,
        })
      }
    }

    await auditLogService.log({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: AuditAction.REPORT_EXPORT,
      entityType: 'faculty_eval_report',
      entityId: input.scheduleId,
      metadata: { format: input.format, totalResponses: report.totalResponses },
    })

    const slug = report.schedule.title.replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 40) || 'faculty-eval'
    const title = `Faculty evaluation report — ${report.schedule.title}`
    const footer = [
      report.anonymity,
      `Schedule status: ${report.schedule.status}`,
      `Total responses: ${report.totalResponses}`,
      `Opens: ${report.schedule.opensAt ?? '—'}`,
      `Closes: ${report.schedule.closesAt ?? '—'}`,
    ]

    if (input.format === 'csv') {
      return {
        contentType: 'text/csv; charset=utf-8',
        filename: `faculty-eval-${slug}.csv`,
        body: Buffer.from(rowsToCsv(rows), 'utf8'),
      }
    }
    if (input.format === 'xlsx') {
      return {
        contentType: 'application/vnd.ms-excel',
        filename: `faculty-eval-${slug}.xls`,
        body: Buffer.from(rowsToExcelXml(rows, 'FacultyEval'), 'utf8'),
      }
    }
    return {
      contentType: 'application/pdf',
      filename: `faculty-eval-${slug}.pdf`,
      body: rowsToSimplePdf(title, rows, footer),
    }
  }
}

export const facultyEvalService = new FacultyEvalService()
