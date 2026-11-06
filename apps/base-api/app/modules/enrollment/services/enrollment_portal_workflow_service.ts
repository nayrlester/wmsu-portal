import Enrollment from '#modules/enrollment/models/enrollment'
import UsisCurriculum from '#modules/enrollment/models/usis_curriculum'
import EnrollmentLine from '#modules/enrollment/models/enrollment_line'
import FacultyClassAssignment from '#modules/enrollment/models/faculty_class_assignment'
import User from '#modules/enrollment/models/user'
import Section from '#modules/enrollment/models/section'
import { SchedulingService } from '#modules/enrollment/services/scheduling_service'
import { resolveEnrollmentApprovalSteps } from '#modules/enrollment/services/academic_policy_runtime_service'
import { AssessmentService } from '#modules/enrollment/services/assessment_service'
import { studentCourseSelectionService } from '#modules/enrollment/services/student_course_selection_service'

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function formatMinutes(total: number) {
  const h = Math.floor(total / 60)
  const m = total % 60
  return `${h}:${String(m).padStart(2, '0')}`
}

function formatMeetingSlot(dayOfWeek: number, startMinute: number, endMinute: number, roomCode: string | null) {
  const day = DAY_LABELS[dayOfWeek] ?? `D${dayOfWeek}`
  const room = roomCode?.trim() ? ` · ${roomCode.trim()}` : ''
  return `${day} ${formatMinutes(startMinute)}–${formatMinutes(endMinute)}${room}`
}

type StepState = 'complete' | 'current' | 'pending' | 'skipped'

export type EnrollmentWorkflowStep = {
  key: string
  label: string
  state: StepState
  detail: string | null
}

export class EnrollmentPortalWorkflowService {
  private scheduling = new SchedulingService()

  async resolvePrimaryEnrollment(organizationId: string, studentId: string) {
    const rows = await Enrollment.query()
      .where('organization_id', organizationId)
      .where('student_id', studentId)
      .whereNotIn('status', ['rejected'])
      .orderBy('created_at', 'desc')
      .limit(10)
    const rank = (s: string) => {
      if (s === 'registered') return 0
      if (s === 'registrar_approved') return 1
      if (s === 'payment_verified') return 2
      if (s === 'assessed') return 3
      if (s === 'advised') return 4
      return 5
    }
    rows.sort((a, b) => rank(a.status) - rank(b.status) || b.createdAt.toMillis() - a.createdAt.toMillis())
    return rows[0] ?? null
  }

  async buildWorkflowForEnrollment(organizationId: string, enrollmentId: string) {
    const enrollment = await Enrollment.query()
      .where('id', enrollmentId)
      .where('organization_id', organizationId)
      .preload('student')
      .preload('section')
      .preload('academicYear')
      .firstOrFail()

    const advisingSkippedForPriorCourse = await studentCourseSelectionService.skipAdvisingWhenPreviouslyEnrolled(enrollment)
    const courseBilled = await studentCourseSelectionService.ensureSelectedCourseBilled(enrollment)
    if (advisingSkippedForPriorCourse || courseBilled) {
      await enrollment.refresh()
      await enrollment.load('student')
      await enrollment.load('section')
      await enrollment.load('academicYear')
    }

    const approvalSteps = await resolveEnrollmentApprovalSteps(organizationId)
    const registrarStepEnabled = approvalSteps.includes('registrar')

    const advisingSkipped = enrollment.advisingWaived
    const advisedComplete =
      advisingSkipped ||
      Boolean(enrollment.advisedAt) ||
      ['advised', 'assessed', 'payment_verified', 'registrar_approved', 'registered'].includes(enrollment.status)

    const assessedComplete = ['assessed', 'payment_verified', 'registrar_approved', 'registered'].includes(
      enrollment.status
    )

    const paymentComplete = enrollment.paymentVerified || enrollment.status === 'registered'

    const registrarComplete =
      !registrarStepEnabled ||
      Boolean(enrollment.registrarApprovedAt) ||
      enrollment.status === 'registered'

    const registeredComplete = enrollment.status === 'registered'

    const steps: EnrollmentWorkflowStep[] = [
      {
        key: 'advising',
        label: 'Academic advising',
        state: advisingSkipped ? 'skipped' : advisedComplete ? 'complete' : 'current',
        detail: enrollment.advisingWaiverId
          ? 'Advising waived per policy'
          : advisingSkipped
            ? 'Previously enrolled. The existing course continues without advising.'
            : enrollment.advisedAt
              ? `Endorsed ${enrollment.advisedAt.toISO()}`
              : null,
      },
      {
        key: 'assessment',
        label: 'Assessment',
        state: assessedComplete ? 'complete' : advisedComplete ? 'current' : 'pending',
        detail: enrollment.assessedAt ? `Assessed ${enrollment.assessedAt.toISO()}` : null,
      },
      {
        key: 'payment',
        label: 'Payment',
        state: paymentComplete ? 'complete' : assessedComplete ? 'current' : 'pending',
        detail: enrollment.paymentVerifiedAt ? `Verified ${enrollment.paymentVerifiedAt.toISO()}` : null,
      },
    ]

    if (registrarStepEnabled) {
      steps.push({
        key: 'registrar',
        label: 'Registrar approval',
        state: registrarComplete ? 'complete' : paymentComplete ? 'current' : 'pending',
        detail: enrollment.registrarApprovedAt ? `Approved ${enrollment.registrarApprovedAt.toISO()}` : null,
      })
    }

    steps.push({
      key: 'registration',
      label: 'Official registration',
      state: registeredComplete ? 'complete' : registrarComplete && paymentComplete ? 'current' : 'pending',
      detail: enrollment.registeredAt ? `Registered ${enrollment.registeredAt.toISO()}` : null,
    })

    const scheduleRows = await this.buildScheduleRows(organizationId, enrollment.id)
    const selectedCurriculum = enrollment.curriculumId
      ? await UsisCurriculum.query()
          .where('organization_id', organizationId)
          .where('id', enrollment.curriculumId)
          .preload('program')
          .first()
      : null
    const assessmentService = new AssessmentService()
    let tuitionSummary: {
      netAmount: number | null
      balanceAmount: number | null
      minimumDueRequired: number | null
    } = { netAmount: null, balanceAmount: null, minimumDueRequired: null }
    if (enrollment.studentId) {
      try {
        const monitor = await assessmentService.getStudentAccountMonitor(organizationId, enrollment.studentId)
        tuitionSummary = {
          netAmount: monitor.latestAssessment ? Number(monitor.latestAssessment.netAmount) : null,
          balanceAmount: monitor.tuitionBalance ? Number(monitor.tuitionBalance.balanceAmount) : null,
          minimumDueRequired:
            monitor.tuitionBalance?.minimumDueRequired != null
              ? Number(monitor.tuitionBalance.minimumDueRequired)
              : monitor.paymentSchedule?.minimumDueRequired != null
                ? Number(monitor.paymentSchedule.minimumDueRequired)
                : null,
        }
      } catch {
        tuitionSummary = { netAmount: null, balanceAmount: null, minimumDueRequired: null }
      }
    }

    return {
      enrollment: {
        id: enrollment.id,
        status: enrollment.status,
        yearLevel: enrollment.yearLevel,
        semester: enrollment.semester,
        classification: enrollment.classification,
        sectionCode: enrollment.section?.code ?? null,
        academicYearCode: enrollment.academicYear?.code ?? null,
        paymentVerified: enrollment.paymentVerified,
        advisingWaived: enrollment.advisingWaived,
        courseCode: selectedCurriculum?.program?.code ?? selectedCurriculum?.code ?? null,
        courseName: selectedCurriculum?.program?.name ?? selectedCurriculum?.name ?? null,
      },
      approvalSteps,
      workflowSteps: steps,
      scheduleRows,
      tuitionSummary,
    }
  }

  async buildScheduleRows(organizationId: string, enrollmentId: string) {
    const lines = await EnrollmentLine.query()
      .where('organization_id', organizationId)
      .where('enrollment_id', enrollmentId)
      .whereNot('status', 'dropped')
      .orderBy('subject_code', 'asc')

    const sectionIds = [...new Set(lines.map((l) => l.sectionId).filter(Boolean) as string[])]
    if (!sectionIds.length) {
      return lines.map((line) => ({
        lineId: line.id,
        subjectCode: line.subjectCode,
        subjectTitle: line.subjectTitle,
        units: Number(line.units),
        sectionCode: null as string | null,
        status: line.status,
        meetingLabels: [] as string[],
        facultyNames: [] as string[],
      }))
    }

    const sections = await Section.query().where('organization_id', organizationId).whereIn('id', sectionIds)
    const sectionById = new Map(sections.map((s) => [s.id, s]))
    const meetings = await this.scheduling.meetingsForSections(organizationId, sectionIds)
    const meetingsBySection = new Map<string, typeof meetings>()
    for (const m of meetings) {
      const list = meetingsBySection.get(m.sectionId) ?? []
      list.push(m)
      meetingsBySection.set(m.sectionId, list)
    }

    const assignments = await FacultyClassAssignment.query()
      .where('organization_id', organizationId)
      .whereIn('section_id', sectionIds)
      .where('is_active', true)
    const facultyIds = [...new Set(assignments.map((a) => a.facultyUserId))]
    const facultyUsers =
      facultyIds.length > 0
        ? await User.query().where('organization_id', organizationId).whereIn('id', facultyIds)
        : []
    const facultyById = new Map(facultyUsers.map((u) => [u.id, `${u.lastName}, ${u.firstName}`.trim()]))

    const facultyBySection = new Map<string, string[]>()
    for (const a of assignments) {
      const name = facultyById.get(a.facultyUserId)
      if (!name) continue
      const list = facultyBySection.get(a.sectionId) ?? []
      if (!list.includes(name)) list.push(name)
      facultyBySection.set(a.sectionId, list)
    }

    return lines.map((line) => {
      const sectionId = line.sectionId
      const section = sectionId ? sectionById.get(sectionId) : null
      const sectionMeetings = sectionId ? meetingsBySection.get(sectionId) ?? [] : []
      const meetingLabels = sectionMeetings.map((m) =>
        formatMeetingSlot(m.dayOfWeek, m.startMinute, m.endMinute, m.roomCode)
      )
      const facultyFromMeetings = sectionMeetings
        .map((m) => (m.facultyUserId ? facultyById.get(m.facultyUserId) : null))
        .filter((n): n is string => Boolean(n))
      const facultyFromAssignment = sectionId ? facultyBySection.get(sectionId) ?? [] : []
      const facultyNames = [...new Set([...facultyFromAssignment, ...facultyFromMeetings])]
      return {
        lineId: line.id,
        subjectCode: line.subjectCode,
        subjectTitle: line.subjectTitle,
        units: Number(line.units),
        sectionCode: section?.code ?? null,
        status: line.status,
        meetingLabels,
        facultyNames,
      }
    })
  }
}

export const enrollmentPortalWorkflowService = new EnrollmentPortalWorkflowService()
