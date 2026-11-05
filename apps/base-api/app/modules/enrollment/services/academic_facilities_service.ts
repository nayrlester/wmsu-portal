import UsisRoomCategory from '#modules/enrollment/models/usis_room_category'
import UsisBuilding from '#modules/enrollment/models/usis_building'
import UsisRoom from '#modules/enrollment/models/usis_room'
import { auditLogService } from '#modules/enrollment/services/audit_log_service'
import { AuditAction } from '#modules/enrollment/domain/enums/index'

export class AcademicFacilitiesService {
  listCategories(organizationId: string) {
    return UsisRoomCategory.query().where('organization_id', organizationId).orderBy('code', 'asc')
  }

  async createCategory(input: { organizationId: string; code: string; name: string; actorUserId: string }) {
    const row = await UsisRoomCategory.create({
      organizationId: input.organizationId,
      code: input.code.trim(),
      name: input.name.trim(),
    })
    await auditLogService.log({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: AuditAction.CREATE,
      entityType: 'room_category',
      entityId: row.id,
    })
    return row
  }

  listBuildings(organizationId: string) {
    return UsisBuilding.query().where('organization_id', organizationId).orderBy('code', 'asc')
  }

  async createBuilding(input: {
    organizationId: string
    code: string
    name: string
    campusCode?: string | null
    actorUserId: string
  }) {
    const row = await UsisBuilding.create({
      organizationId: input.organizationId,
      code: input.code.trim(),
      name: input.name.trim(),
      campusCode: input.campusCode?.trim() || null,
      isActive: true,
    })
    await auditLogService.log({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: AuditAction.CREATE,
      entityType: 'building',
      entityId: row.id,
    })
    return row
  }

  listRooms(organizationId: string, buildingId?: string) {
    const q = UsisRoom.query()
      .where('organization_id', organizationId)
      .preload('building')
      .preload('category')
      .orderBy('code', 'asc')
    if (buildingId) q.where('building_id', buildingId)
    return q
  }

  async createRoom(input: {
    organizationId: string
    buildingId: string
    categoryId?: string | null
    code: string
    name: string
    capacity?: number | null
    actorUserId: string
  }) {
    await UsisBuilding.query()
      .where('organization_id', input.organizationId)
      .where('id', input.buildingId)
      .firstOrFail()

    if (input.categoryId) {
      await UsisRoomCategory.query()
        .where('organization_id', input.organizationId)
        .where('id', input.categoryId)
        .firstOrFail()
    }

    const row = await UsisRoom.create({
      organizationId: input.organizationId,
      buildingId: input.buildingId,
      categoryId: input.categoryId ?? null,
      code: input.code.trim(),
      name: input.name.trim(),
      capacity: input.capacity ?? null,
      isActive: true,
    })
    await auditLogService.log({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: AuditAction.CREATE,
      entityType: 'room',
      entityId: row.id,
    })
    return row
  }
}

export const academicFacilitiesService = new AcademicFacilitiesService()
