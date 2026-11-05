import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import { admissionFormService } from '#modules/enrollment/services/admission_form_service'

const fieldSchema = vine.object({
  key: vine.string().trim().minLength(1).maxLength(64),
  label: vine.string().trim().minLength(1).maxLength(255),
  type: vine.enum(['text', 'email', 'tel', 'date', 'select', 'textarea'] as const),
  required: vine.boolean().optional(),
  options: vine.array(vine.string().trim().maxLength(128)).optional(),
})

const surveySchema = vine.object({
  key: vine.string().trim().minLength(1).maxLength(64),
  prompt: vine.string().trim().minLength(1).maxLength(500),
  required: vine.boolean().optional(),
})

const createConfigValidator = vine.compile(
  vine.object({
    version: vine.string().trim().minLength(1).maxLength(32),
    name: vine.string().trim().minLength(2).maxLength(255),
    formFields: vine.array(fieldSchema).optional(),
    surveyQuestions: vine.array(surveySchema).optional(),
    termsText: vine.string().optional(),
    privacyConsentText: vine.string().optional(),
    isActive: vine.boolean().optional(),
  })
)

const updateConfigValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(2).maxLength(255).optional(),
    formFields: vine.array(fieldSchema).optional(),
    surveyQuestions: vine.array(surveySchema).optional(),
    termsText: vine.string().optional(),
    privacyConsentText: vine.string().optional(),
    isActive: vine.boolean().optional(),
  })
)

const onlineApplyValidator = vine.compile(
  vine.object({
    orgCode: vine.string().trim().maxLength(32).optional(),
    applicationNumber: vine.string().trim().maxLength(64).optional(),
    firstName: vine.string().trim().minLength(1).maxLength(128),
    middleName: vine.string().trim().maxLength(128).optional(),
    lastName: vine.string().trim().minLength(1).maxLength(128),
    email: vine.string().email(),
    mobile: vine.string().trim().maxLength(32).optional(),
    birthDate: vine.string().optional(),
    programId: vine.string().uuid().optional(),
    classification: vine
      .enum(['new', 'freshman', 'transferee', 'returning'] as const)
      .optional(),
    formAnswers: vine.record(vine.any()).optional(),
    surveyAnswers: vine.record(vine.any()).optional(),
    termsAccepted: vine.boolean(),
    privacyConsentAccepted: vine.boolean(),
    autoAssignEntranceExam: vine.boolean().optional(),
  })
)

function serializeConfig(row: {
  id: string
  version: string
  name: string
  formFields: unknown
  surveyQuestions: unknown
  termsText: string
  privacyConsentText: string
  isActive: boolean
}) {
  return {
    id: row.id,
    version: row.version,
    name: row.name,
    formFields: row.formFields,
    surveyQuestions: row.surveyQuestions,
    termsText: row.termsText,
    privacyConsentText: row.privacyConsentText,
    isActive: row.isActive,
  }
}

export default class AdmissionFormsController {
  async list(ctx: HttpContext) {
    const rows = await admissionFormService.listConfigs(ctx.auth.user!.organizationId)
    return ctx.response.ok({ data: rows.map(serializeConfig) })
  }

  async active(ctx: HttpContext) {
    const orgId = ctx.auth.user?.organizationId
      ? ctx.auth.user.organizationId
      : await admissionFormService.resolveOrganizationId(ctx.request.input('orgCode'))
    const row = await admissionFormService.getActive(orgId)
    if (!row) return ctx.response.ok({ data: null })
    return ctx.response.ok({ data: serializeConfig(row) })
  }

  async store(ctx: HttpContext) {
    const user = ctx.auth.user!
    const body = await ctx.request.validateUsing(createConfigValidator)
    const row = await admissionFormService.createConfig(user.organizationId, body, user.id)
    return ctx.response.created({ data: serializeConfig(row) })
  }

  async update(ctx: HttpContext) {
    const user = ctx.auth.user!
    const body = await ctx.request.validateUsing(updateConfigValidator)
    const row = await admissionFormService.updateConfig(
      user.organizationId,
      ctx.params.id,
      body,
      user.id
    )
    return ctx.response.ok({ data: serializeConfig(row) })
  }

  async applyOnline(ctx: HttpContext) {
    const body = await ctx.request.validateUsing(onlineApplyValidator)
    const organizationId = await admissionFormService.resolveOrganizationId(body.orgCode)
    const result = await admissionFormService.createOnlineApplication({
      organizationId,
      applicationNumber: body.applicationNumber,
      firstName: body.firstName,
      middleName: body.middleName,
      lastName: body.lastName,
      email: body.email,
      mobile: body.mobile,
      birthDate: body.birthDate,
      programId: body.programId,
      classification: body.classification,
      formAnswers: body.formAnswers as Record<string, unknown> | undefined,
      surveyAnswers: body.surveyAnswers as Record<string, unknown> | undefined,
      termsAccepted: body.termsAccepted,
      privacyConsentAccepted: body.privacyConsentAccepted,
      autoAssignEntranceExam: body.autoAssignEntranceExam,
    })
    const payload = {
      data: {
        id: result.applicant.id,
        applicationNumber: result.applicant.applicationNumber,
        status: result.applicant.status,
        classification: result.applicant.classification,
        privacyConsentVersion: result.applicant.privacyConsentVersion,
        formConfigId: result.applicant.formConfigId,
        entranceExamAssigned: Boolean(result.examAssignment),
        entranceExamEventId: result.examAssignment?.eventId ?? null,
        reusedExisting: Boolean(result.reused),
        nextPath: result.examAssignment
          ? '/apply/exam'
          : result.applicant.classification === 'transferee'
            ? '/apply/status'
            : '/apply/status',
      },
    }
    return result.reused ? ctx.response.ok(payload) : ctx.response.created(payload)
  }
}
