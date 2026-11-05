import { DateTime } from 'luxon'
import Enrollment from '#modules/enrollment/models/enrollment'
import GradeDeadline from '#modules/enrollment/models/grade_deadline'
import GradeEntry from '#modules/enrollment/models/grade_entry'
import Student from '#modules/enrollment/models/student'
import UsisFacultyEvalSchedule from '#modules/enrollment/models/usis_faculty_eval_schedule'
import { facultyEvalService } from '#modules/enrollment/services/faculty_eval_service'

export type StudentTaskCalendarItemKind = 'faculty_evaluation' | 'grade_posted' | 'grade_period_end'

export type StudentTaskCalendarItem = {
  id: string
  kind: StudentTaskCalendarItemKind
  title: string
  detail: string
  dueAt: string | null
  occurredAt: string | null
  actionPath: string
  status: 'open' | 'upcoming' | 'overdue'
}

export type StudentTaskCalendarPayload = {
  generatedAt: string
  pendingFacultyEvalCount: number
  nearestDueAt: string | null
  items: StudentTaskCalendarItem[]
}

function iso(dt: DateTime | null | undefined) {
  return dt?.toISO() ?? null
}

function itemStatus(dueAt: DateTime | null, now: DateTime): 'open' | 'upcoming' | 'overdue' {
  if (!dueAt) return 'open'
  if (dueAt <= now) return 'overdue'
  return 'upcoming'
}

export class StudentPortalService {
  async taskCalendar(organizationId: string, student: Student): Promise<StudentTaskCalendarPayload> {
    const now = DateTime.now()
    const items: StudentTaskCalendarItem[] = []

    const pending = await facultyEvalService.pendingForStudent(organizationId, student)
    const scheduleIds = [...new Set(pending.items.map((i) => i.scheduleId))]
    const schedules =
      scheduleIds.length > 0
        ? await UsisFacultyEvalSchedule.query().whereIn('id', scheduleIds)
        : []
    const closesBySchedule = new Map(schedules.map((s) => [s.id, s.closesAt]))

    for (const row of pending.items) {
      const due = closesBySchedule.get(row.scheduleId) ?? null
      items.push({
        id: `faculty-eval:${row.targetId}`,
        kind: 'faculty_evaluation',
        title: `Faculty evaluation: ${row.facultyName}`,
        detail: `${row.scheduleTitle} · ${row.sectionLabel}${row.subjectCode ? ` · ${row.subjectCode}` : ''}`,
        dueAt: iso(due),
        occurredAt: null,
        actionPath: '/student/faculty-eval',
        status: itemStatus(due, now),
      })
    }

    const activeEnrollments = await Enrollment.query()
      .where('organization_id', organizationId)
      .where('student_id', student.id)
      .whereIn('status', ['registered', 'payment_verified', 'assessed', 'advised'])
      .orderBy('created_at', 'desc')
      .limit(6)

    const deadlineKeys = new Set<string>()
    for (const enr of activeEnrollments) {
      const key = `${enr.academicYearId}:${enr.semester}`
      if (deadlineKeys.has(key)) continue
      deadlineKeys.add(key)
      const deadline = await GradeDeadline.query()
        .where('organization_id', organizationId)
        .where('academic_year_id', enr.academicYearId)
        .where('semester', enr.semester)
        .first()
      if (!deadline?.submitDeadlineAt) continue
      if (deadline.submitDeadlineAt <= now.minus({ days: 1 })) continue
      items.push({
        id: `grade-period:${deadline.id}`,
        kind: 'grade_period_end',
        title: 'Grade posting period ends',
        detail: `Semester ${enr.semester} · official grade submission window`,
        dueAt: iso(deadline.submitDeadlineAt),
        occurredAt: null,
        actionPath: '/student/grades',
        status: itemStatus(deadline.submitDeadlineAt, now),
      })
    }

    const recentGrades = await GradeEntry.query()
      .where('organization_id', organizationId)
      .where('student_id', student.id)
      .whereNotNull('submitted_at')
      .where('submitted_at', '>=', now.minus({ days: 21 }).toJSDate())
      .orderBy('submitted_at', 'desc')
      .limit(12)

    for (const grade of recentGrades) {
      const mark = grade.markCode ?? (grade.numericGrade != null ? String(grade.numericGrade) : grade.grade != null ? String(grade.grade) : '—')
      items.push({
        id: `grade-posted:${grade.id}`,
        kind: 'grade_posted',
        title: `Grade posted: ${grade.courseCode}`,
        detail: `${mark} · ${grade.courseTitle}`,
        dueAt: null,
        occurredAt: iso(grade.submittedAt),
        actionPath: '/student/grades',
        status: 'open',
      })
    }

    items.sort((a, b) => {
      const rank = (k: StudentTaskCalendarItemKind) =>
        k === 'faculty_evaluation' ? 0 : k === 'grade_period_end' ? 1 : 2
      const dr = rank(a.kind) - rank(b.kind)
      if (dr !== 0) return dr
      const ad = a.dueAt ? DateTime.fromISO(a.dueAt).toMillis() : Number.MAX_SAFE_INTEGER
      const bd = b.dueAt ? DateTime.fromISO(b.dueAt).toMillis() : Number.MAX_SAFE_INTEGER
      if (ad !== bd) return ad - bd
      const ao = a.occurredAt ? DateTime.fromISO(a.occurredAt).toMillis() : 0
      const bo = b.occurredAt ? DateTime.fromISO(b.occurredAt).toMillis() : 0
      return bo - ao
    })

    const dueCandidates = items
      .map((i) => (i.dueAt ? DateTime.fromISO(i.dueAt) : null))
      .filter((d): d is DateTime => !!d && d > now)
      .sort((a, b) => a.toMillis() - b.toMillis())

    return {
      generatedAt: now.toISO()!,
      pendingFacultyEvalCount: pending.items.length,
      nearestDueAt: dueCandidates[0] ? iso(dueCandidates[0]) : null,
      items,
    }
  }
}

export const studentPortalService = new StudentPortalService()
