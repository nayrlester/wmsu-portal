import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import { facultyEvalService } from '#modules/enrollment/services/faculty_eval_service'

const codeValidator = vine.compile(
  vine.object({
    code: vine.string().trim().minLength(2).maxLength(32),
    name: vine.string().trim().minLength(2).maxLength(255),
    description: vine.string().trim().optional(),
  })
)

const questionValidator = vine.compile(
  vine.object({
    prompt: vine.string().trim().minLength(3),
    code: vine.string().trim().maxLength(64).optional(),
    questionType: vine.enum(['likert', 'text'] as const).optional(),
    sortOrder: vine.number().optional(),
  })
)

const scheduleValidator = vine.compile(
  vine.object({
    evalCodeId: vine.string().uuid(),
    title: vine.string().trim().minLength(3).maxLength(500),
    questionIds: vine.array(vine.string().uuid()).minLength(1),
    opensAt: vine.date().optional(),
    closesAt: vine.date().optional(),
    openNow: vine.boolean().optional(),
    targets: vine
      .array(
        vine.object({
          facultyUserId: vine.string().uuid(),
          sectionId: vine.string().uuid().nullable(),
          subjectCode: vine.string().trim().optional(),
          subjectTitle: vine.string().trim().optional(),
        })
      )
      .minLength(1),
  })
)

const responseValidator = vine.compile(
  vine.object({
    targetId: vine.string().uuid(),
    answers: vine.object({}).allowUnknownProperties(),
  })
)

export default class FacultyEvalController {
  private orgUser(ctx: HttpContext) {
    return ctx.auth.user ?? ctx.platformUser ?? null
  }

  async codesIndex(ctx: HttpContext) {
    const user = this.orgUser(ctx)
    if (!user) return ctx.response.unauthorized({ error: 'Unauthorized' })
    const data = await facultyEvalService.listCodes(user.organizationId)
    return ctx.response.ok({ data })
  }

  async codesStore(ctx: HttpContext) {
    const user = this.orgUser(ctx)
    if (!user) return ctx.response.unauthorized({ error: 'Unauthorized' })
    const body = await ctx.request.validateUsing(codeValidator)
    const data = await facultyEvalService.createCode({
      organizationId: user.organizationId,
      code: body.code,
      name: body.name,
      description: body.description,
    })
    return ctx.response.created({ data })
  }

  async questionsIndex(ctx: HttpContext) {
    const user = this.orgUser(ctx)
    if (!user) return ctx.response.unauthorized({ error: 'Unauthorized' })
    const data = await facultyEvalService.listQuestions(user.organizationId)
    return ctx.response.ok({ data })
  }

  async questionsStore(ctx: HttpContext) {
    const user = this.orgUser(ctx)
    if (!user) return ctx.response.unauthorized({ error: 'Unauthorized' })
    const body = await ctx.request.validateUsing(questionValidator)
    const data = await facultyEvalService.createQuestion({
      organizationId: user.organizationId,
      prompt: body.prompt,
      code: body.code,
      questionType: body.questionType,
      sortOrder: body.sortOrder,
    })
    return ctx.response.created({ data })
  }

  async schedulesIndex(ctx: HttpContext) {
    const user = this.orgUser(ctx)
    if (!user) return ctx.response.unauthorized({ error: 'Unauthorized' })
    const page = Number(ctx.request.input('page', 1))
    const limit = Number(ctx.request.input('limit', 20))
    const data = await facultyEvalService.listSchedules(user.organizationId, page, limit)
    return ctx.response.ok({ data })
  }

  async schedulesStore(ctx: HttpContext) {
    const user = this.orgUser(ctx)
    if (!user) return ctx.response.unauthorized({ error: 'Unauthorized' })
    const body = await ctx.request.validateUsing(scheduleValidator)
    const data = await facultyEvalService.createSchedule({
      organizationId: user.organizationId,
      userId: user.id,
      evalCodeId: body.evalCodeId,
      title: body.title,
      questionIds: body.questionIds,
      opensAt: body.opensAt,
      closesAt: body.closesAt,
      openNow: body.openNow,
      targets: body.targets,
    })
    return ctx.response.created({ data })
  }

  async schedulesOpen(ctx: HttpContext) {
    const user = this.orgUser(ctx)
    if (!user) return ctx.response.unauthorized({ error: 'Unauthorized' })
    const data = await facultyEvalService.openSchedule(ctx.params.id, user.organizationId, user.id)
    return ctx.response.ok({ data })
  }

  async assignmentOptions(ctx: HttpContext) {
    const user = this.orgUser(ctx)
    if (!user) return ctx.response.unauthorized({ error: 'Unauthorized' })
    const data = await facultyEvalService.listAssignmentOptions(user.organizationId)
    return ctx.response.ok({ data })
  }

  async pending(ctx: HttpContext) {
    const user = this.orgUser(ctx)
    if (!user) return ctx.response.unauthorized({ error: 'Unauthorized' })
    const student = await facultyEvalService.resolveStudent(user.organizationId, user.email)
    if (!student) {
      return ctx.response.ok({ data: { items: [], questions: [], studentLinked: false } })
    }
    const pending = await facultyEvalService.pendingForStudent(user.organizationId, student)
    return ctx.response.ok({ data: { ...pending, studentLinked: true } })
  }

  async responsesStore(ctx: HttpContext) {
    const user = this.orgUser(ctx)
    if (!user) return ctx.response.unauthorized({ error: 'Unauthorized' })
    const body = await ctx.request.validateUsing(responseValidator)
    const student = await facultyEvalService.resolveStudent(user.organizationId, user.email)
    if (!student) {
      return ctx.response.unprocessableEntity({ error: 'No student profile linked to this account' })
    }
    try {
      const answers: Record<string, number | string> = {}
      for (const [key, val] of Object.entries(body.answers)) {
        if (typeof val === 'number' || typeof val === 'string') answers[key] = val
      }
      const data = await facultyEvalService.submitResponse({
        organizationId: user.organizationId,
        student,
        targetId: body.targetId,
        answers,
      })
      return ctx.response.created({ data })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not submit evaluation'
      return ctx.response.unprocessableEntity({ error: message })
    }
  }

  async report(ctx: HttpContext) {
    const user = this.orgUser(ctx)
    if (!user) return ctx.response.unauthorized({ error: 'Unauthorized' })
    const data = await facultyEvalService.reportForSchedule(ctx.params.scheduleId, user.organizationId)
    return ctx.response.ok({ data })
  }
}
