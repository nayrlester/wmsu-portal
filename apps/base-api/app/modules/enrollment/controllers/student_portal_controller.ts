import type { HttpContext } from '@adonisjs/core/http'
import { facultyEvalService } from '#modules/enrollment/services/faculty_eval_service'
import { studentPortalService } from '#modules/enrollment/services/student_portal_service'
import { academicPoliciesService } from '#modules/enrollment/services/academic_policies_service'
import { resolveEnrollmentApprovalSteps } from '#modules/enrollment/services/academic_policy_runtime_service'

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

  async enrollmentPolicy(ctx: HttpContext) {
    const user = ctx.auth.user ?? ctx.platformUser
    if (!user) return ctx.response.unauthorized({ error: 'Unauthorized' })
    const policy = await academicPoliciesService.getOrCreate(user.organizationId)
    const steps = await resolveEnrollmentApprovalSteps(user.organizationId)
    return ctx.response.ok({
      data: {
        enrollmentApprovalSteps: steps,
        gradeDisplayMode: policy.gradeDisplayMode,
      },
    })
  }
}
