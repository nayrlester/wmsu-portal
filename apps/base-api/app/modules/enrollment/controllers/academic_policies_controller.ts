import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import { academicPoliciesService } from '#modules/enrollment/services/academic_policies_service'

const updateValidator = vine.compile(
  vine.object({
    enrollmentApprovalSteps: vine.array(vine.string().trim().maxLength(64)).minLength(1),
    gradeDisplayMode: vine.enum(['immediate', 'after_deadline', 'manual_release'] as const),
    gradeDocumentSignatories: vine.array(
      vine.object({
        docType: vine.string().trim().maxLength(64),
        role: vine.string().trim().maxLength(64),
        name: vine.string().trim().maxLength(255),
      })
    ),
  })
)

export default class AcademicPoliciesController {
  async show(ctx: HttpContext) {
    const user = ctx.auth.user!
    const row = await academicPoliciesService.getOrCreate(user.organizationId)
    return ctx.response.ok({
      data: {
        enrollmentApprovalSteps: row.enrollmentApprovalSteps,
        gradeDisplayMode: row.gradeDisplayMode,
        gradeDocumentSignatories: row.gradeDocumentSignatories,
      },
    })
  }

  async update(ctx: HttpContext) {
    const user = ctx.auth.user!
    const body = await ctx.request.validateUsing(updateValidator)
    const row = await academicPoliciesService.update({
      organizationId: user.organizationId,
      enrollmentApprovalSteps: body.enrollmentApprovalSteps,
      gradeDisplayMode: body.gradeDisplayMode,
      gradeDocumentSignatories: body.gradeDocumentSignatories,
      actorUserId: user.id,
    })
    return ctx.response.ok({
      data: {
        enrollmentApprovalSteps: row.enrollmentApprovalSteps,
        gradeDisplayMode: row.gradeDisplayMode,
        gradeDocumentSignatories: row.gradeDocumentSignatories,
      },
    })
  }
}
