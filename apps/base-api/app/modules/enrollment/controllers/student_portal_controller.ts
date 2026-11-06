import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import AcademicYear from '#modules/enrollment/models/academic_year'
import { facultyEvalService } from '#modules/enrollment/services/faculty_eval_service'
import { studentPortalService } from '#modules/enrollment/services/student_portal_service'
import { academicPoliciesService } from '#modules/enrollment/services/academic_policies_service'
import { resolveEnrollmentApprovalSteps } from '#modules/enrollment/services/academic_policy_runtime_service'
import { enrollmentPortalWorkflowService } from '#modules/enrollment/services/enrollment_portal_workflow_service'
import { subjectCreditService } from '#modules/enrollment/services/subject_credit_service'
import { EnrollmentFlowService } from '#modules/enrollment/services/enrollment_flow_service'
import { EnrollmentWorkflowError } from '#modules/enrollment/domain/enrollment_workflow'
import { studentCourseSelectionService } from '#modules/enrollment/services/student_course_selection_service'

const selectCourseValidator = vine.compile(
  vine.object({
    curriculumId: vine.string().uuid(),
  })
)

const startEnrollmentValidator = vine.compile(
  vine.object({
    academicYearId: vine.string().uuid(),
    semester: vine.number().min(1).max(3),
    yearLevel: vine.number().min(1).max(10).optional(),
  })
)

export default class StudentPortalController {
  async taskCalendar(ctx: HttpContext) {
    const user = ctx.auth.user ?? ctx.platformUser
    if (!user) return ctx.response.unauthorized({ error: 'Unauthorized' })

    const email = user.email?.trim().toLowerCase()
    if (!email) {
      return ctx.response.notFound({ error: 'No student profile linked to this account' })
    }

    const student = await facultyEvalService.resolveStudent(user.organizationId, email)
    if (!student) {
      return ctx.response.notFound({ error: 'No student profile linked to this account' })
    }

    const data = await studentPortalService.taskCalendar(user.organizationId, student)
    return ctx.response.ok({ data })
  }

  async gradeFeedback(ctx: HttpContext) {
    const user = ctx.auth.user ?? ctx.platformUser
    if (!user) return ctx.response.unauthorized({ error: 'Unauthorized' })

    const email = user.email?.trim().toLowerCase()
    if (!email) {
      return ctx.response.notFound({ error: 'No student profile linked to this account' })
    }

    const student = await facultyEvalService.resolveStudent(user.organizationId, email)
    if (!student) {
      return ctx.response.notFound({ error: 'No student profile linked to this account' })
    }

    const sinceMinutes = Number(ctx.request.input('sinceMinutes', 60))
    const data = await studentPortalService.gradeFeedback(user.organizationId, student, sinceMinutes)
    return ctx.response.ok({ data })
  }

  async enrollmentPolicy(ctx: HttpContext) {
    const user = ctx.auth.user ?? ctx.platformUser
    if (!user) return ctx.response.unauthorized({ error: 'Unauthorized' })
    const policy = await academicPoliciesService.getOrCreate(user.organizationId)
    const steps = await resolveEnrollmentApprovalSteps(user.organizationId)
    const email = user.email?.trim().toLowerCase()
    const student = email ? await facultyEvalService.resolveStudent(user.organizationId, email) : null
    const window = student
      ? await academicPoliciesService.studentEnrollmentWindow(user.organizationId, student.id)
      : {
          nextTermEnrollmentOpen: Boolean(policy.nextTermEnrollmentOpen),
          canStartEnrollment: true,
          enrollmentHoldReason: null as string | null,
        }
    return ctx.response.ok({
      data: {
        enrollmentApprovalSteps: steps,
        gradeDisplayMode: policy.gradeDisplayMode,
        nextTermEnrollmentOpen: window.nextTermEnrollmentOpen,
        canStartEnrollment: window.canStartEnrollment,
        enrollmentHoldReason: window.enrollmentHoldReason,
      },
    })
  }

  async enrollmentWorkflow(ctx: HttpContext) {
    const user = ctx.auth.user ?? ctx.platformUser
    if (!user) return ctx.response.unauthorized({ error: 'Unauthorized' })

    const email = user.email?.trim().toLowerCase()
    if (!email) {
      return ctx.response.notFound({ error: 'No student profile linked to this account' })
    }

    const student = await facultyEvalService.resolveStudent(user.organizationId, email)
    if (!student) {
      return ctx.response.notFound({ error: 'No student profile linked to this account' })
    }

    const enrollment = await enrollmentPortalWorkflowService.resolvePrimaryEnrollment(
      user.organizationId,
      student.id
    )
    if (!enrollment) {
      return ctx.response.ok({ data: null })
    }

    const data = await enrollmentPortalWorkflowService.buildWorkflowForEnrollment(
      user.organizationId,
      enrollment.id
    )
    return ctx.response.ok({ data })
  }

  async curriculumPlan(ctx: HttpContext) {
    const user = ctx.auth.user ?? ctx.platformUser
    if (!user) return ctx.response.unauthorized({ error: 'Unauthorized' })
    const email = user.email?.trim().toLowerCase()
    if (!email) {
      return ctx.response.notFound({ error: 'No student profile linked to this account' })
    }
    const student = await facultyEvalService.resolveStudent(user.organizationId, email)
    if (!student) {
      return ctx.response.notFound({ error: 'No student profile linked to this account' })
    }
    const data = await subjectCreditService.evaluate(user.organizationId, student.id)
    return ctx.response.ok({
      data: {
        ...data,
        student: {
          id: student.id,
          studentNumber: student.studentNumber,
          yearLevel: student.yearLevel,
          programId: student.programId,
        },
      },
    })
  }

  async openAcademicYears(ctx: HttpContext) {
    const user = ctx.auth.user ?? ctx.platformUser
    if (!user) return ctx.response.unauthorized({ error: 'Unauthorized' })
    const active = await AcademicYear.query()
      .where('organization_id', user.organizationId)
      .where('is_active', true)
      .orderBy('start_date', 'desc')
    const years =
      active.length > 0
        ? active
        : await AcademicYear.query()
            .where('organization_id', user.organizationId)
            .orderBy('start_date', 'desc')
            .limit(8)
    return ctx.response.ok({
      data: years.map((y) => ({
        id: y.id,
        code: y.code,
        name: y.name,
        isActive: y.isActive,
        startDate: y.startDate?.toISODate?.() ?? null,
        endDate: y.endDate?.toISODate?.() ?? null,
      })),
    })
  }

  async courseChoice(ctx: HttpContext) {
    const linked = await this.linkedStudent(ctx)
    if (!linked) return
    const data = await studentCourseSelectionService.courseChoice(linked.user.organizationId, linked.student.id)
    return ctx.response.ok({ data })
  }

  async selectCourse(ctx: HttpContext) {
    const linked = await this.linkedStudent(ctx)
    if (!linked) return
    try {
      const payload = await ctx.request.validateUsing(selectCourseValidator)
      const data = await studentCourseSelectionService.selectStudentCourse({
        organizationId: linked.user.organizationId,
        studentId: linked.student.id,
        curriculumId: payload.curriculumId,
      })
      return ctx.response.ok({ data })
    } catch (error) {
      if (error instanceof EnrollmentWorkflowError) {
        return ctx.response.status(error.status).send({
          success: false,
          error: error.message,
          code: error.code,
        })
      }
      throw error
    }
  }

  private async linkedStudent(ctx: HttpContext) {
    const user = ctx.auth.user ?? ctx.platformUser
    if (!user) {
      ctx.response.unauthorized({ error: 'Unauthorized' })
      return null
    }
    const email = user.email?.trim().toLowerCase()
    if (!email) {
      ctx.response.notFound({ error: 'No student profile linked to this account' })
      return null
    }
    const student = await facultyEvalService.resolveStudent(user.organizationId, email)
    if (!student) {
      ctx.response.notFound({ error: 'No student profile linked to this account' })
      return null
    }
    return { user, student }
  }

  async startEnrollment(ctx: HttpContext) {
    const user = ctx.auth.user ?? ctx.platformUser
    if (!user) return ctx.response.unauthorized({ error: 'Unauthorized' })
    const email = user.email?.trim().toLowerCase()
    if (!email) {
      return ctx.response.notFound({ error: 'No student profile linked to this account' })
    }
    const student = await facultyEvalService.resolveStudent(user.organizationId, email)
    if (!student) {
      return ctx.response.notFound({ error: 'No student profile linked to this account' })
    }

    try {
      const payload = await ctx.request.validateUsing(startEnrollmentValidator)
      const year = await AcademicYear.query()
        .where('organization_id', user.organizationId)
        .where('id', payload.academicYearId)
        .first()
      if (!year) {
        return ctx.response.unprocessableEntity({ error: 'Academic year not found' })
      }
      const window = await academicPoliciesService.studentEnrollmentWindow(user.organizationId, student.id)
      if (!window.canStartEnrollment) {
        throw new EnrollmentWorkflowError(
          window.enrollmentHoldReason ?? 'Enrollment for the next term is closed',
          422,
          'ENROLLMENT_PERIOD_CLOSED'
        )
      }

      const service = new EnrollmentFlowService()
      const enrollment = await service.createEnrollment({
        organizationId: user.organizationId,
        studentId: student.id,
        academicYearId: year.id,
        yearLevel: payload.yearLevel ?? student.yearLevel ?? 1,
        semester: payload.semester,
        classification: student.classification || 'continuing',
        actorUserId: user.id,
      })
      return ctx.response.created({ data: enrollment })
    } catch (error) {
      if (error instanceof EnrollmentWorkflowError) {
        return ctx.response.status(error.status).send({
          success: false,
          error: error.message,
          code: error.code,
        })
      }
      throw error
    }
  }
}
