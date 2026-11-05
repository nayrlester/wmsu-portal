import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import { academicFacilitiesService } from '#modules/enrollment/services/academic_facilities_service'

const categoryValidator = vine.compile(
  vine.object({
    code: vine.string().trim().maxLength(32),
    name: vine.string().trim().maxLength(128),
  })
)

const buildingValidator = vine.compile(
  vine.object({
    code: vine.string().trim().maxLength(32),
    name: vine.string().trim().maxLength(255),
    campusCode: vine.string().trim().maxLength(64).optional(),
  })
)

const roomValidator = vine.compile(
  vine.object({
    buildingId: vine.string().uuid(),
    categoryId: vine.string().uuid().optional(),
    code: vine.string().trim().maxLength(64),
    name: vine.string().trim().maxLength(255),
    capacity: vine.number().min(0).optional(),
  })
)

export default class AcademicFacilitiesController {
  async listCategories(ctx: HttpContext) {
    const user = ctx.auth.user!
    const rows = await academicFacilitiesService.listCategories(user.organizationId)
    return ctx.response.ok({
      data: rows.map((r) => ({ id: r.id, code: r.code, name: r.name })),
    })
  }

  async createCategory(ctx: HttpContext) {
    const user = ctx.auth.user!
    const body = await ctx.request.validateUsing(categoryValidator)
    const row = await academicFacilitiesService.createCategory({
      organizationId: user.organizationId,
      code: body.code,
      name: body.name,
      actorUserId: user.id,
    })
    return ctx.response.created({ data: row })
  }

  async listBuildings(ctx: HttpContext) {
    const user = ctx.auth.user!
    const rows = await academicFacilitiesService.listBuildings(user.organizationId)
    return ctx.response.ok({
      data: rows.map((r) => ({
        id: r.id,
        code: r.code,
        name: r.name,
        campusCode: r.campusCode,
        isActive: r.isActive,
      })),
    })
  }

  async createBuilding(ctx: HttpContext) {
    const user = ctx.auth.user!
    const body = await ctx.request.validateUsing(buildingValidator)
    const row = await academicFacilitiesService.createBuilding({
      organizationId: user.organizationId,
      code: body.code,
      name: body.name,
      campusCode: body.campusCode ?? null,
      actorUserId: user.id,
    })
    return ctx.response.created({ data: row })
  }

  async listRooms(ctx: HttpContext) {
    const user = ctx.auth.user!
    const buildingId = ctx.request.input('buildingId') as string | undefined
    const rows = await academicFacilitiesService.listRooms(user.organizationId, buildingId)
    return ctx.response.ok({
      data: rows.map((r) => ({
        id: r.id,
        code: r.code,
        name: r.name,
        capacity: r.capacity,
        isActive: r.isActive,
        buildingCode: r.building?.code ?? '',
        categoryCode: r.category?.code ?? null,
      })),
    })
  }

  async createRoom(ctx: HttpContext) {
    const user = ctx.auth.user!
    const body = await ctx.request.validateUsing(roomValidator)
    const row = await academicFacilitiesService.createRoom({
      organizationId: user.organizationId,
      buildingId: body.buildingId,
      categoryId: body.categoryId ?? null,
      code: body.code,
      name: body.name,
      capacity: body.capacity ?? null,
      actorUserId: user.id,
    })
    return ctx.response.created({ data: row })
  }
}
