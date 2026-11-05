import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import { academicStructureService } from '#modules/enrollment/services/academic_structure_service'

const codeName = {
  code: vine.string().trim().minLength(1).maxLength(32),
  name: vine.string().trim().minLength(2).maxLength(255),
}

const createCollegeValidator = vine.compile(
  vine.object({
    ...codeName,
    deanName: vine.string().trim().maxLength(255).optional(),
    isActive: vine.boolean().optional(),
  })
)

const updateCollegeValidator = vine.compile(
  vine.object({
    code: vine.string().trim().minLength(1).maxLength(32).optional(),
    name: vine.string().trim().minLength(2).maxLength(255).optional(),
    deanName: vine.string().trim().maxLength(255).nullable().optional(),
    isActive: vine.boolean().optional(),
  })
)

const createDepartmentValidator = vine.compile(
  vine.object({
    collegeId: vine.string().uuid(),
    ...codeName,
    headName: vine.string().trim().maxLength(255).optional(),
    headPlatformUserId: vine.string().trim().maxLength(64).optional(),
    isActive: vine.boolean().optional(),
  })
)

const updateDepartmentValidator = vine.compile(
  vine.object({
    collegeId: vine.string().uuid().optional(),
    code: vine.string().trim().minLength(1).maxLength(32).optional(),
    name: vine.string().trim().minLength(2).maxLength(255).optional(),
    headName: vine.string().trim().maxLength(255).nullable().optional(),
    headPlatformUserId: vine.string().trim().maxLength(64).nullable().optional(),
    isActive: vine.boolean().optional(),
  })
)

const createPositionValidator = vine.compile(
  vine.object({
    ...codeName,
    isActive: vine.boolean().optional(),
  })
)

const updatePositionValidator = vine.compile(
  vine.object({
    code: vine.string().trim().minLength(1).maxLength(32).optional(),
    name: vine.string().trim().minLength(2).maxLength(255).optional(),
    isActive: vine.boolean().optional(),
  })
)

const createSubjectAreaValidator = vine.compile(
  vine.object({
    ...codeName,
    collegeId: vine.string().uuid().optional(),
    isActive: vine.boolean().optional(),
  })
)

const updateSubjectAreaValidator = vine.compile(
  vine.object({
    code: vine.string().trim().minLength(1).maxLength(32).optional(),
    name: vine.string().trim().minLength(2).maxLength(255).optional(),
    collegeId: vine.string().uuid().nullable().optional(),
    isActive: vine.boolean().optional(),
  })
)

const createAssignmentValidator = vine.compile(
  vine.object({
    platformUserId: vine.string().trim().minLength(1).maxLength(64),
    displayName: vine.string().trim().maxLength(255).optional(),
    collegeId: vine.string().uuid().optional(),
    academicDepartmentId: vine.string().uuid().optional(),
    positionId: vine.string().uuid().optional(),
    isDepartmentHead: vine.boolean().optional(),
    isActive: vine.boolean().optional(),
  })
)

const updateAssignmentValidator = vine.compile(
  vine.object({
    displayName: vine.string().trim().maxLength(255).nullable().optional(),
    collegeId: vine.string().uuid().nullable().optional(),
    academicDepartmentId: vine.string().uuid().nullable().optional(),
    positionId: vine.string().uuid().nullable().optional(),
    isDepartmentHead: vine.boolean().optional(),
    isActive: vine.boolean().optional(),
  })
)

function serializeCollege(row: {
  id: string
  code: string
  name: string
  deanName: string | null
  isActive: boolean
}) {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    deanName: row.deanName,
    isActive: row.isActive,
  }
}

function serializeDepartment(row: {
  id: string
  collegeId: string
  code: string
  name: string
  headName: string | null
  headPlatformUserId: string | null
  isActive: boolean
  college?: { code: string; name: string } | null
}) {
  return {
    id: row.id,
    collegeId: row.collegeId,
    collegeCode: row.college?.code ?? null,
    collegeName: row.college?.name ?? null,
    code: row.code,
    name: row.name,
    headName: row.headName,
    headPlatformUserId: row.headPlatformUserId,
    isActive: row.isActive,
  }
}

export default class AcademicStructureController {
  async listColleges(ctx: HttpContext) {
    const rows = await academicStructureService.listColleges(ctx.auth.user!.organizationId)
    return ctx.response.ok({ data: rows.map(serializeCollege) })
  }

  async createCollege(ctx: HttpContext) {
    const user = ctx.auth.user!
    const body = await ctx.request.validateUsing(createCollegeValidator)
    const row = await academicStructureService.createCollege(user.organizationId, body, user.id)
    return ctx.response.created({ data: serializeCollege(row) })
  }

  async updateCollege(ctx: HttpContext) {
    const user = ctx.auth.user!
    const body = await ctx.request.validateUsing(updateCollegeValidator)
    const row = await academicStructureService.updateCollege(
      user.organizationId,
      ctx.params.id,
      body,
      user.id
    )
    return ctx.response.ok({ data: serializeCollege(row) })
  }

  async listDepartments(ctx: HttpContext) {
    const collegeId = ctx.request.input('collegeId') || undefined
    const rows = await academicStructureService.listDepartments(
      ctx.auth.user!.organizationId,
      collegeId
    )
    return ctx.response.ok({ data: rows.map(serializeDepartment) })
  }

  async createDepartment(ctx: HttpContext) {
    const user = ctx.auth.user!
    const body = await ctx.request.validateUsing(createDepartmentValidator)
    const row = await academicStructureService.createDepartment(user.organizationId, body, user.id)
    return ctx.response.created({ data: serializeDepartment(row) })
  }

  async updateDepartment(ctx: HttpContext) {
    const user = ctx.auth.user!
    const body = await ctx.request.validateUsing(updateDepartmentValidator)
    const row = await academicStructureService.updateDepartment(
      user.organizationId,
      ctx.params.id,
      body,
      user.id
    )
    return ctx.response.ok({ data: serializeDepartment(row) })
  }

  async listPositions(ctx: HttpContext) {
    const rows = await academicStructureService.listPositions(ctx.auth.user!.organizationId)
    return ctx.response.ok({
      data: rows.map((r) => ({
        id: r.id,
        code: r.code,
        name: r.name,
        isActive: r.isActive,
      })),
    })
  }

  async createPosition(ctx: HttpContext) {
    const user = ctx.auth.user!
    const body = await ctx.request.validateUsing(createPositionValidator)
    const row = await academicStructureService.createPosition(user.organizationId, body, user.id)
    return ctx.response.created({
      data: { id: row.id, code: row.code, name: row.name, isActive: row.isActive },
    })
  }

  async updatePosition(ctx: HttpContext) {
    const user = ctx.auth.user!
    const body = await ctx.request.validateUsing(updatePositionValidator)
    const row = await academicStructureService.updatePosition(
      user.organizationId,
      ctx.params.id,
      body,
      user.id
    )
    return ctx.response.ok({
      data: { id: row.id, code: row.code, name: row.name, isActive: row.isActive },
    })
  }

  async listSubjectAreas(ctx: HttpContext) {
    const collegeId = ctx.request.input('collegeId') || undefined
    const rows = await academicStructureService.listSubjectAreas(
      ctx.auth.user!.organizationId,
      collegeId
    )
    return ctx.response.ok({
      data: rows.map((r) => ({
        id: r.id,
        collegeId: r.collegeId,
        collegeCode: r.college?.code ?? null,
        code: r.code,
        name: r.name,
        isActive: r.isActive,
      })),
    })
  }

  async createSubjectArea(ctx: HttpContext) {
    const user = ctx.auth.user!
    const body = await ctx.request.validateUsing(createSubjectAreaValidator)
    const row = await academicStructureService.createSubjectArea(user.organizationId, body, user.id)
    return ctx.response.created({
      data: {
        id: row.id,
        collegeId: row.collegeId,
        code: row.code,
        name: row.name,
        isActive: row.isActive,
      },
    })
  }

  async updateSubjectArea(ctx: HttpContext) {
    const user = ctx.auth.user!
    const body = await ctx.request.validateUsing(updateSubjectAreaValidator)
    const row = await academicStructureService.updateSubjectArea(
      user.organizationId,
      ctx.params.id,
      body,
      user.id
    )
    return ctx.response.ok({
      data: {
        id: row.id,
        collegeId: row.collegeId,
        code: row.code,
        name: row.name,
        isActive: row.isActive,
      },
    })
  }

  async listAssignments(ctx: HttpContext) {
    const rows = await academicStructureService.listAssignments(ctx.auth.user!.organizationId)
    return ctx.response.ok({
      data: rows.map((r) => ({
        id: r.id,
        platformUserId: r.platformUserId,
        displayName: r.displayName,
        collegeId: r.collegeId,
        collegeCode: r.college?.code ?? null,
        academicDepartmentId: r.academicDepartmentId,
        academicDepartmentCode: r.academicDepartment?.code ?? null,
        positionId: r.positionId,
        positionCode: r.position?.code ?? null,
        isDepartmentHead: r.isDepartmentHead,
        isActive: r.isActive,
      })),
    })
  }

  async createAssignment(ctx: HttpContext) {
    const user = ctx.auth.user!
    const body = await ctx.request.validateUsing(createAssignmentValidator)
    const row = await academicStructureService.createAssignment(user.organizationId, body, user.id)
    return ctx.response.created({
      data: {
        id: row.id,
        platformUserId: row.platformUserId,
        displayName: row.displayName,
        collegeId: row.collegeId,
        academicDepartmentId: row.academicDepartmentId,
        positionId: row.positionId,
        isDepartmentHead: row.isDepartmentHead,
        isActive: row.isActive,
      },
    })
  }

  async updateAssignment(ctx: HttpContext) {
    const user = ctx.auth.user!
    const body = await ctx.request.validateUsing(updateAssignmentValidator)
    const row = await academicStructureService.updateAssignment(
      user.organizationId,
      ctx.params.id,
      body,
      user.id
    )
    return ctx.response.ok({
      data: {
        id: row.id,
        platformUserId: row.platformUserId,
        displayName: row.displayName,
        collegeId: row.collegeId,
        academicDepartmentId: row.academicDepartmentId,
        positionId: row.positionId,
        isDepartmentHead: row.isDepartmentHead,
        isActive: row.isActive,
      },
    })
  }
}
