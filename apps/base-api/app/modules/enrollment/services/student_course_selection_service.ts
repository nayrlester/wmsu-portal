import db from '@adonisjs/lucid/services/db'
import { randomUUID } from 'node:crypto'
import { DateTime } from 'luxon'
import { t } from '#modules/enrollment/helpers/db_schema'
import Enrollment from '#modules/enrollment/models/enrollment'
import EnrollmentLine from '#modules/enrollment/models/enrollment_line'
import AdvisingSession from '#modules/enrollment/models/advising_session'
import { EnrollmentWorkflowError } from '#modules/enrollment/domain/enrollment_workflow'
import { curriculumService } from '#modules/enrollment/services/curriculum_service'
import { evaluateCurriculum } from '#modules/enrollment/services/enrollment_validation_service'

const OPEN_STATUSES = ['draft', 'advising']
const CONTINUING_STATUSES = ['draft', 'advising', 'advised']

type CourseOption = Awaited<ReturnType<typeof curriculumService.advisingCourseOptions>>[number]

function advisedIds(enrollment: Enrollment) {
  const stored = enrollment.advisedCurriculumIds
  if (Array.isArray(stored) && stored.length) return [...new Set(stored)]
  return enrollment.advisedCurriculumId ? [enrollment.advisedCurriculumId] : []
}

function courseSummary(course: CourseOption) {
  return {
    id: course.id,
    code: course.code,
    name: course.name,
    subjects: course.subjects.map((subject) => ({
      subjectCode: subject.subjectCode,
      title: subject.title,
      units: subject.units,
    })),
  }
}

export class StudentCourseSelectionService {
  async openEnrollment(organizationId: string, studentId: string) {
    const enrollment = await Enrollment.query()
      .where('organization_id', organizationId)
      .where('student_id', studentId)
      .whereIn('status', OPEN_STATUSES)
      .orderBy('created_at', 'desc')
      .first()
    if (enrollment) await this.skipAdvisingWhenPreviouslyEnrolled(enrollment)
    if (enrollment && OPEN_STATUSES.includes(enrollment.status)) return enrollment
    const pendingChoice = await Enrollment.query()
      .where('organization_id', organizationId)
      .where('student_id', studentId)
      .where('status', 'advised')
      .whereNull('curriculum_id')
      .orderBy('created_at', 'desc')
      .first()
    if (pendingChoice && advisedIds(pendingChoice).length > 0) return pendingChoice
    return null
  }

  async skipAdvisingWhenPreviouslyEnrolled(enrollment: Enrollment) {
    if (!CONTINUING_STATUSES.includes(enrollment.status)) return false
    if (enrollment.advisingWaived && enrollment.status === 'advised') return false
    if (!enrollment.curriculumId) return false
    const allowed = advisedIds(enrollment)
    if (allowed.length && !allowed.includes(enrollment.curriculumId)) return false
    const prior = await Enrollment.query()
      .where('organization_id', enrollment.organizationId)
      .where('student_id', enrollment.studentId)
      .whereNot('id', enrollment.id)
      .where('status', 'registered')
      .orderBy('created_at', 'desc')
      .first()
    if (!prior) return false
    const fromStatus = enrollment.status
    await db.transaction(async (trx) => {
      enrollment.useTransaction(trx)
      await AdvisingSession.query({ client: trx })
        .where('enrollment_id', enrollment.id)
        .where('status', 'in_progress')
        .update({ status: 'cancelled' })
      enrollment.advisingWaived = true
      enrollment.advisedAt = enrollment.advisedAt ?? DateTime.now()
      enrollment.status = 'advised'
      await enrollment.save()
      if (fromStatus !== 'advised') {
        await db.table(t('enrollment_status_history')).useTransaction(trx).insert({
          id: randomUUID(),
          organization_id: enrollment.organizationId,
          enrollment_id: enrollment.id,
          from_status: fromStatus,
          to_status: 'advised',
          actor_user_id: null,
          notes: 'Advising skipped because the student already has a registered course',
          created_at: new Date(),
        })
      }
    })
    return true
  }

  private async coursesFor(enrollment: Enrollment) {
    await enrollment.load('student')
    const evaluation = await evaluateCurriculum({
      organizationId: enrollment.organizationId,
      studentId: enrollment.studentId,
      programId: enrollment.student?.programId ?? null,
      yearLevel: enrollment.yearLevel,
    })
    return curriculumService.advisingCourseOptions({
      organizationId: enrollment.organizationId,
      studentProgramId: enrollment.student?.programId ?? null,
      yearLevel: enrollment.yearLevel,
      semester: enrollment.semester,
      assessedSubjects: evaluation.assessedSubjects,
    })
  }

  async courseChoice(organizationId: string, studentId: string) {
    const enrollment = await this.openEnrollment(organizationId, studentId)
    if (!enrollment) {
      return {
        enrollmentId: null,
        enrollmentStatus: null,
        yearLevel: null,
        semester: null,
        adviserCourses: [],
        selectedCourse: null,
        requiresCourseSelection: false,
      }
    }
    const courses = await this.coursesFor(enrollment)
    const adviserCourses = advisedIds(enrollment)
      .map((id) => courses.find((course) => course.id === id))
      .filter((course): course is CourseOption => Boolean(course))
      .map(courseSummary)
    const selected = courses.find((course) => course.id === enrollment.curriculumId) ?? null
    return {
      enrollmentId: enrollment.id,
      enrollmentStatus: enrollment.status,
      yearLevel: enrollment.yearLevel,
      semester: enrollment.semester,
      adviserCourses,
      selectedCourse: selected ? courseSummary(selected) : null,
      requiresCourseSelection: adviserCourses.length > 0 && !selected,
    }
  }

  async assignAdviserCourses(input: { organizationId: string; sessionId: string; curriculumIds: string[] }) {
    const session = await AdvisingSession.query()
      .where('id', input.sessionId)
      .where('organization_id', input.organizationId)
      .preload('enrollment', (query) => query.preload('student'))
      .firstOrFail()
    const enrollment = session.enrollment
    if (!enrollment || session.status !== 'in_progress' || !OPEN_STATUSES.includes(enrollment.status)) {
      throw new EnrollmentWorkflowError('Course selection is only available during advising', 422, 'COURSE_SELECTION_CLOSED')
    }
    const courses = await this.coursesFor(enrollment)
    const uniqueIds = [...new Set(input.curriculumIds)]
    const selected = uniqueIds
      .map((id) => courses.find((item) => item.id === id))
      .filter((course): course is CourseOption => Boolean(course))
    if (selected.length !== uniqueIds.length) {
      throw new EnrollmentWorkflowError('One of those courses is not available for this student', 422, 'COURSE_NOT_AVAILABLE')
    }
    await db.transaction(async (trx) => {
      enrollment.useTransaction(trx)
      if (enrollment.curriculumId && !uniqueIds.includes(enrollment.curriculumId)) {
        enrollment.curriculumId = null
        await EnrollmentLine.query({ client: trx }).where('enrollment_id', enrollment.id).delete()
      }
      enrollment.advisedCurriculumIds = uniqueIds
      enrollment.advisedCurriculumId = uniqueIds[0] ?? null
      await enrollment.save()
    })
    return { enrollmentId: enrollment.id, adviserCourses: selected.map(courseSummary) }
  }

  async selectStudentCourse(input: { organizationId: string; studentId: string; curriculumId: string }) {
    const enrollment = await this.openEnrollment(input.organizationId, input.studentId)
    if (!enrollment) {
      throw new EnrollmentWorkflowError('No open enrollment is waiting for a course', 422, 'COURSE_SELECTION_CLOSED')
    }
    const allowed = advisedIds(enrollment)
    if (!allowed.length) {
      throw new EnrollmentWorkflowError('Your adviser has not selected a course yet', 422, 'ADVISER_COURSE_REQUIRED')
    }
    if (!allowed.includes(input.curriculumId)) {
      throw new EnrollmentWorkflowError('Select a course from the list your adviser gave you', 422, 'COURSE_NOT_AVAILABLE')
    }
    const courses = await this.coursesFor(enrollment)
    const course = courses.find((item) => item.id === input.curriculumId)
    if (!course || course.subjects.length === 0) {
      throw new EnrollmentWorkflowError('That course has no remaining subjects for this term', 422, 'COURSE_NOT_AVAILABLE')
    }
    await db.transaction(async (trx) => {
      enrollment.useTransaction(trx)
      enrollment.curriculumId = course.id
      await enrollment.save()
      await EnrollmentLine.query({ client: trx }).where('enrollment_id', enrollment.id).delete()
      for (const subject of course.subjects) {
        await EnrollmentLine.create(
          {
            organizationId: enrollment.organizationId,
            enrollmentId: enrollment.id,
            subjectId: subject.id,
            subjectCode: subject.subjectCode,
            subjectTitle: subject.title,
            units: Number(subject.units),
            sectionId: null,
            status: 'planned',
          },
          { client: trx }
        )
      }
    })
    await this.skipAdvisingWhenPreviouslyEnrolled(enrollment)
    await this.ensureSelectedCourseBilled(enrollment)
    return {
      enrollmentId: enrollment.id,
      selectedCourse: courseSummary(course),
    }
  }

  async ensureSelectedCourseBilled(enrollment: Enrollment) {
    if (!enrollment.curriculumId || !enrollment.advisedBy) return false
    if (!['advised', 'assessed'].includes(enrollment.status)) return false
    const lines = await EnrollmentLine.query()
      .where('enrollment_id', enrollment.id)
      .whereNot('status', 'dropped')
    if (!lines.length) return false
    const { default: Assessment } = await import('#modules/enrollment/models/assessment')
    const submitted = await Assessment.query()
      .where('enrollment_id', enrollment.id)
      .where('ufms_sync_status', 'submitted')
      .first()
    if (submitted) return false
    const { EnrollmentFlowService } = await import('#modules/enrollment/services/enrollment_flow_service')
    await new EnrollmentFlowService().assess(enrollment.id, enrollment.advisedBy, {
      tuitionFee: 0,
      miscFees: 0,
    })
    return true
  }
}

export const studentCourseSelectionService = new StudentCourseSelectionService()
