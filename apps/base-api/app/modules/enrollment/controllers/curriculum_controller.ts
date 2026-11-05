import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import { curriculumService } from '#modules/enrollment/services/curriculum_service'

const createCurriculumValidator = vine.compile(
  vine.object({
    programId: vine.string().uuid(),
    code: vine.string().trim().minLength(2).maxLength(64),
    name: vine.string().trim().minLength(2).maxLength(255),
    versionLabel: vine.string().trim().maxLength(64).optional(),
  })
)

const updateCurriculumValidator = vine.compile(
  vine.object({
    programId: vine.string().uuid().optional(),
    code: vine.string().trim().minLength(2).maxLength(64).optional(),
    name: vine.string().trim().minLength(2).maxLength(255).optional(),
    isActive: vine.boolean().optional(),
  })
)

const createVersionValidator = vine.compile(
  vine.object({
    versionLabel: vine.string().trim().minLength(1).maxLength(64),
    notes: vine.string().trim().optional(),
    effectiveFrom: vine.string().trim().optional(),
  })
)

const duplicateVersionValidator = vine.compile(
  vine.object({
    versionLabel: vine.string().trim().minLength(1).maxLength(64),
    notes: vine.string().trim().optional(),
  })
)

const statusValidator = vine.compile(
  vine.object({
    status: vine.enum(['draft', 'active', 'archived'] as const),
  })
)

const addSubjectValidator = vine.compile(
  vine.object({
    subjectId: vine.string().uuid(),
    yearLevel: vine.number().min(1).max(12).optional(),
    semester: vine.number().min(1).max(4).optional(),
    isRequired: vine.boolean().optional(),
    sortOrder: vine.number().optional(),
  })
)

const updateSubjectValidator = vine.compile(
  vine.object({
    title: vine.string().trim().minLength(1).maxLength(255).optional(),
    subjectCode: vine.string().trim().minLength(1).maxLength(32).optional(),
    units: vine.number().min(0).max(30).optional(),
    lectureHours: vine.number().min(0).max(200).nullable().optional(),
    laboratoryHours: vine.number().min(0).max(200).nullable().optional(),
    isActive: vine.boolean().optional(),
  })
)

const linkSubjectValidator = vine.compile(
  vine.object({
    requiresSubjectId: vine.string().uuid().optional(),
    corequisiteSubjectId: vine.string().uuid().optional(),
  })
)

function serializeVersion(row: {
  id: string
  curriculumId: string
  versionLabel: string
  status: string
  effectiveFrom: { toISODate(): string | null } | null
  notes: string | null
  duplicatedFromVersionId: string | null
  createdAt: { toISO(): string | null }
}) {
  return {
    id: row.id,
    curriculumId: row.curriculumId,
    versionLabel: row.versionLabel,
    status: row.status,
    effectiveFrom: row.effectiveFrom?.toISODate() ?? null,
    notes: row.notes,
    duplicatedFromVersionId: row.duplicatedFromVersionId,
    createdAt: row.createdAt.toISO(),
  }
}

export default class CurriculumController {
  async listCurricula(ctx: HttpContext) {
    const rows = await curriculumService.listCurricula(
      ctx.auth.user!.organizationId,
      ctx.request.input('programId') || undefined
    )
    return ctx.response.ok({
      data: rows.map((c) => ({
        id: c.id,
        programId: c.programId,
        programCode: c.program?.code ?? null,
        programName: c.program?.name ?? null,
        code: c.code,
        name: c.name,
        isActive: c.isActive,
        versions: (c.versions ?? []).map(serializeVersion),
      })),
    })
  }

  async createCurriculum(ctx: HttpContext) {
    const user = ctx.auth.user!
    const body = await ctx.request.validateUsing(createCurriculumValidator)
    const { curriculum, version } = await curriculumService.createCurriculum(
      user.organizationId,
      body,
      user.id
    )
    return ctx.response.created({
      data: {
        id: curriculum.id,
        programId: curriculum.programId,
        code: curriculum.code,
        name: curriculum.name,
        version: serializeVersion(version),
      },
    })
  }

  async updateCurriculum(ctx: HttpContext) {
    const user = ctx.auth.user!
    const body = await ctx.request.validateUsing(updateCurriculumValidator)
    const curriculum = await curriculumService.updateCurriculum(
      user.organizationId,
      ctx.params.id,
      body,
      user.id
    )
    return ctx.response.ok({
      data: {
        id: curriculum.id,
        programId: curriculum.programId,
        code: curriculum.code,
        name: curriculum.name,
        isActive: curriculum.isActive,
      },
    })
  }

  async deleteCurriculum(ctx: HttpContext) {
    const user = ctx.auth.user!
    await curriculumService.deleteCurriculum(user.organizationId, ctx.params.id, user.id)
    return ctx.response.ok({ data: { id: ctx.params.id, deleted: true } })
  }

  async listVersions(ctx: HttpContext) {
    const rows = await curriculumService.listVersions(
      ctx.auth.user!.organizationId,
      ctx.params.id
    )
    return ctx.response.ok({ data: rows.map(serializeVersion) })
  }

  async createVersion(ctx: HttpContext) {
    const user = ctx.auth.user!
    const body = await ctx.request.validateUsing(createVersionValidator)
    const row = await curriculumService.createVersion(
      user.organizationId,
      ctx.params.id,
      body,
      user.id
    )
    return ctx.response.created({ data: serializeVersion(row) })
  }

  async duplicateVersion(ctx: HttpContext) {
    const user = ctx.auth.user!
    const body = await ctx.request.validateUsing(duplicateVersionValidator)
    const row = await curriculumService.duplicateVersion(
      user.organizationId,
      ctx.params.versionId,
      body,
      user.id
    )
    return ctx.response.created({ data: serializeVersion(row) })
  }

  async updateVersionStatus(ctx: HttpContext) {
    const user = ctx.auth.user!
    const body = await ctx.request.validateUsing(statusValidator)
    const row = await curriculumService.updateVersionStatus(
      user.organizationId,
      ctx.params.versionId,
      body.status,
      user.id
    )
    return ctx.response.ok({ data: serializeVersion(row) })
  }

  async listVersionSubjects(ctx: HttpContext) {
    const rows = await curriculumService.listVersionSubjects(
      ctx.auth.user!.organizationId,
      ctx.params.versionId
    )
    return ctx.response.ok({
      data: rows.map((r) => ({
        id: r.id,
        subjectId: r.subjectId,
        subjectCode: r.subject?.subjectCode ?? null,
        title: r.subject?.title ?? null,
        units: r.subject?.units ?? null,
        lectureHours: r.subject?.lectureHours ?? null,
        laboratoryHours: r.subject?.laboratoryHours ?? null,
        yearLevel: r.yearLevel,
        semester: r.semester,
        isRequired: r.isRequired,
        sortOrder: r.sortOrder,
      })),
    })
  }

  async addVersionSubject(ctx: HttpContext) {
    const user = ctx.auth.user!
    const body = await ctx.request.validateUsing(addSubjectValidator)
    const row = await curriculumService.addVersionSubject(
      user.organizationId,
      ctx.params.versionId,
      body,
      user.id
    )
    return ctx.response.created({
      data: {
        id: row.id,
        subjectId: row.subjectId,
        yearLevel: row.yearLevel,
        semester: row.semester,
        isRequired: row.isRequired,
      },
    })
  }

  async removeVersionSubject(ctx: HttpContext) {
    const user = ctx.auth.user!
    await curriculumService.removeVersionSubject(
      user.organizationId,
      ctx.params.versionId,
      ctx.params.lineId,
      user.id
    )
    return ctx.response.noContent()
  }

  async updateSubject(ctx: HttpContext) {
    const user = ctx.auth.user!
    const body = await ctx.request.validateUsing(updateSubjectValidator)
    const row = await curriculumService.updateSubjectCatalog(
      user.organizationId,
      ctx.params.id,
      body,
      user.id
    )
    return ctx.response.ok({
      data: {
        id: row.id,
        subjectCode: row.subjectCode,
        title: row.title,
        units: row.units,
        lectureHours: row.lectureHours,
        laboratoryHours: row.laboratoryHours,
        isActive: row.isActive,
      },
    })
  }

  async deleteSubject(ctx: HttpContext) {
    const user = ctx.auth.user!
    await curriculumService.deleteSubject(user.organizationId, ctx.params.id, user.id)
    return ctx.response.ok({ data: { id: ctx.params.id, deleted: true } })
  }

  async listPrerequisites(ctx: HttpContext) {
    const rows = await curriculumService.listPrerequisites(
      ctx.auth.user!.organizationId,
      ctx.params.id
    )
    return ctx.response.ok({
      data: rows.map((r) => ({
        id: r.id,
        requiresSubjectId: r.requiresSubjectId,
        subjectCode: r.requiresSubject?.subjectCode ?? null,
        title: r.requiresSubject?.title ?? null,
      })),
    })
  }

  async addPrerequisite(ctx: HttpContext) {
    const user = ctx.auth.user!
    const body = await ctx.request.validateUsing(linkSubjectValidator)
    if (!body.requiresSubjectId) {
      return ctx.response.unprocessableEntity({ message: 'requiresSubjectId is required' })
    }
    const row = await curriculumService.addPrerequisite(
      user.organizationId,
      ctx.params.id,
      body.requiresSubjectId,
      user.id
    )
    return ctx.response.created({
      data: { id: row.id, requiresSubjectId: row.requiresSubjectId },
    })
  }

  async removePrerequisite(ctx: HttpContext) {
    const user = ctx.auth.user!
    await curriculumService.removePrerequisite(
      user.organizationId,
      ctx.params.id,
      ctx.params.linkId,
      user.id
    )
    return ctx.response.noContent()
  }

  async listCorequisites(ctx: HttpContext) {
    const rows = await curriculumService.listCorequisites(
      ctx.auth.user!.organizationId,
      ctx.params.id
    )
    return ctx.response.ok({
      data: rows.map((r) => ({
        id: r.id,
        corequisiteSubjectId: r.corequisiteSubjectId,
        subjectCode: r.corequisiteSubject?.subjectCode ?? null,
        title: r.corequisiteSubject?.title ?? null,
      })),
    })
  }

  async addCorequisite(ctx: HttpContext) {
    const user = ctx.auth.user!
    const body = await ctx.request.validateUsing(linkSubjectValidator)
    if (!body.corequisiteSubjectId) {
      return ctx.response.unprocessableEntity({ message: 'corequisiteSubjectId is required' })
    }
    const row = await curriculumService.addCorequisite(
      user.organizationId,
      ctx.params.id,
      body.corequisiteSubjectId,
      user.id
    )
    return ctx.response.created({
      data: { id: row.id, corequisiteSubjectId: row.corequisiteSubjectId },
    })
  }

  async removeCorequisite(ctx: HttpContext) {
    const user = ctx.auth.user!
    await curriculumService.removeCorequisite(
      user.organizationId,
      ctx.params.id,
      ctx.params.linkId,
      user.id
    )
    return ctx.response.noContent()
  }
}
