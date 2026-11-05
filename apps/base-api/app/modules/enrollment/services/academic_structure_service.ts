import UsisCollege from '#modules/enrollment/models/usis_college'
import UsisAcademicDepartment from '#modules/enrollment/models/usis_academic_department'
import UsisPosition from '#modules/enrollment/models/usis_position'
import UsisSubjectArea from '#modules/enrollment/models/usis_subject_area'
import UsisEmployeeAssignment from '#modules/enrollment/models/usis_employee_assignment'
import { auditLogService } from '#modules/enrollment/services/audit_log_service'
import { AuditAction } from '#modules/enrollment/domain/enums/index'

function normalizeCode(code: string) {
  return code.trim().toUpperCase()
}

export class AcademicStructureService {
  async listColleges(organizationId: string) {
    return UsisCollege.query()
      .where('organization_id', organizationId)
      .orderBy('code', 'asc')
  }

  async createCollege(
    organizationId: string,
    data: { code: string; name: string; deanName?: string | null; isActive?: boolean },
    actorUserId: string
  ) {
    const row = await UsisCollege.create({
      organizationId,
      code: normalizeCode(data.code),
      name: data.name.trim(),
      deanName: data.deanName?.trim() || null,
      isActive: data.isActive ?? true,
    })
    await auditLogService.log({
      organizationId,
      actorUserId,
      action: AuditAction.CREATE,
      entityType: 'usis_college',
      entityId: row.id,
    })
    return row
  }

  async updateCollege(
    organizationId: string,
    id: string,
    data: Partial<{ code: string; name: string; deanName: string | null; isActive: boolean }>,
    actorUserId: string
  ) {
    const row = await UsisCollege.query()
      .where('organization_id', organizationId)
      .where('id', id)
      .firstOrFail()
    if (data.code !== undefined) row.code = normalizeCode(data.code)
    if (data.name !== undefined) row.name = data.name.trim()
    if (data.deanName !== undefined) row.deanName = data.deanName?.trim() || null
    if (data.isActive !== undefined) row.isActive = data.isActive
    await row.save()
    await auditLogService.log({
      organizationId,
      actorUserId,
      action: AuditAction.UPDATE,
      entityType: 'usis_college',
      entityId: row.id,
    })
    return row
  }

  async listDepartments(organizationId: string, collegeId?: string) {
    const q = UsisAcademicDepartment.query()
      .where('organization_id', organizationId)
      .preload('college')
      .orderBy('code', 'asc')
    if (collegeId) q.where('college_id', collegeId)
    return q
  }

  async createDepartment(
    organizationId: string,
    data: {
      collegeId: string
      code: string
      name: string
      headName?: string | null
      headPlatformUserId?: string | null
      isActive?: boolean
    },
    actorUserId: string
  ) {
    await UsisCollege.query()
      .where('organization_id', organizationId)
      .where('id', data.collegeId)
      .firstOrFail()

    const row = await UsisAcademicDepartment.create({
      organizationId,
      collegeId: data.collegeId,
      code: normalizeCode(data.code),
      name: data.name.trim(),
      headName: data.headName?.trim() || null,
      headPlatformUserId: data.headPlatformUserId?.trim() || null,
      isActive: data.isActive ?? true,
    })
    await auditLogService.log({
      organizationId,
      actorUserId,
      action: AuditAction.CREATE,
      entityType: 'usis_academic_department',
      entityId: row.id,
    })
    return row
  }

  async updateDepartment(
    organizationId: string,
    id: string,
    data: Partial<{
      collegeId: string
      code: string
      name: string
      headName: string | null
      headPlatformUserId: string | null
      isActive: boolean
    }>,
    actorUserId: string
  ) {
    const row = await UsisAcademicDepartment.query()
      .where('organization_id', organizationId)
      .where('id', id)
      .firstOrFail()
    if (data.collegeId !== undefined) {
      await UsisCollege.query()
        .where('organization_id', organizationId)
        .where('id', data.collegeId)
        .firstOrFail()
      row.collegeId = data.collegeId
    }
    if (data.code !== undefined) row.code = normalizeCode(data.code)
    if (data.name !== undefined) row.name = data.name.trim()
    if (data.headName !== undefined) row.headName = data.headName?.trim() || null
    if (data.headPlatformUserId !== undefined) {
      row.headPlatformUserId = data.headPlatformUserId?.trim() || null
    }
    if (data.isActive !== undefined) row.isActive = data.isActive
    await row.save()
    await auditLogService.log({
      organizationId,
      actorUserId,
      action: AuditAction.UPDATE,
      entityType: 'usis_academic_department',
      entityId: row.id,
    })
    return row
  }

  async listPositions(organizationId: string) {
    return UsisPosition.query().where('organization_id', organizationId).orderBy('code', 'asc')
  }

  async createPosition(
    organizationId: string,
    data: { code: string; name: string; isActive?: boolean },
    actorUserId: string
  ) {
    const row = await UsisPosition.create({
      organizationId,
      code: normalizeCode(data.code),
      name: data.name.trim(),
      isActive: data.isActive ?? true,
    })
    await auditLogService.log({
      organizationId,
      actorUserId,
      action: AuditAction.CREATE,
      entityType: 'usis_position',
      entityId: row.id,
    })
    return row
  }

  async updatePosition(
    organizationId: string,
    id: string,
    data: Partial<{ code: string; name: string; isActive: boolean }>,
    actorUserId: string
  ) {
    const row = await UsisPosition.query()
      .where('organization_id', organizationId)
      .where('id', id)
      .firstOrFail()
    if (data.code !== undefined) row.code = normalizeCode(data.code)
    if (data.name !== undefined) row.name = data.name.trim()
    if (data.isActive !== undefined) row.isActive = data.isActive
    await row.save()
    await auditLogService.log({
      organizationId,
      actorUserId,
      action: AuditAction.UPDATE,
      entityType: 'usis_position',
      entityId: row.id,
    })
    return row
  }

  async listSubjectAreas(organizationId: string, collegeId?: string) {
    const q = UsisSubjectArea.query()
      .where('organization_id', organizationId)
      .preload('college')
      .orderBy('code', 'asc')
    if (collegeId) q.where('college_id', collegeId)
    return q
  }

  async createSubjectArea(
    organizationId: string,
    data: { code: string; name: string; collegeId?: string | null; isActive?: boolean },
    actorUserId: string
  ) {
    if (data.collegeId) {
      await UsisCollege.query()
        .where('organization_id', organizationId)
        .where('id', data.collegeId)
        .firstOrFail()
    }
    const row = await UsisSubjectArea.create({
      organizationId,
      collegeId: data.collegeId || null,
      code: normalizeCode(data.code),
      name: data.name.trim(),
      isActive: data.isActive ?? true,
    })
    await auditLogService.log({
      organizationId,
      actorUserId,
      action: AuditAction.CREATE,
      entityType: 'usis_subject_area',
      entityId: row.id,
    })
    return row
  }

  async updateSubjectArea(
    organizationId: string,
    id: string,
    data: Partial<{ code: string; name: string; collegeId: string | null; isActive: boolean }>,
    actorUserId: string
  ) {
    const row = await UsisSubjectArea.query()
      .where('organization_id', organizationId)
      .where('id', id)
      .firstOrFail()
    if (data.collegeId !== undefined) {
      if (data.collegeId) {
        await UsisCollege.query()
          .where('organization_id', organizationId)
          .where('id', data.collegeId)
          .firstOrFail()
      }
      row.collegeId = data.collegeId
    }
    if (data.code !== undefined) row.code = normalizeCode(data.code)
    if (data.name !== undefined) row.name = data.name.trim()
    if (data.isActive !== undefined) row.isActive = data.isActive
    await row.save()
    await auditLogService.log({
      organizationId,
      actorUserId,
      action: AuditAction.UPDATE,
      entityType: 'usis_subject_area',
      entityId: row.id,
    })
    return row
  }

  async listAssignments(organizationId: string) {
    return UsisEmployeeAssignment.query()
      .where('organization_id', organizationId)
      .preload('college')
      .preload('academicDepartment')
      .preload('position')
      .orderBy('created_at', 'desc')
  }

  async createAssignment(
    organizationId: string,
    data: {
      platformUserId: string
      displayName?: string | null
      collegeId?: string | null
      academicDepartmentId?: string | null
      positionId?: string | null
      isDepartmentHead?: boolean
      isActive?: boolean
    },
    actorUserId: string
  ) {
    if (data.collegeId) {
      await UsisCollege.query()
        .where('organization_id', organizationId)
        .where('id', data.collegeId)
        .firstOrFail()
    }
    if (data.academicDepartmentId) {
      await UsisAcademicDepartment.query()
        .where('organization_id', organizationId)
        .where('id', data.academicDepartmentId)
        .firstOrFail()
    }
    if (data.positionId) {
      await UsisPosition.query()
        .where('organization_id', organizationId)
        .where('id', data.positionId)
        .firstOrFail()
    }

    const row = await UsisEmployeeAssignment.create({
      organizationId,
      platformUserId: data.platformUserId.trim(),
      displayName: data.displayName?.trim() || null,
      collegeId: data.collegeId || null,
      academicDepartmentId: data.academicDepartmentId || null,
      positionId: data.positionId || null,
      isDepartmentHead: data.isDepartmentHead ?? false,
      isActive: data.isActive ?? true,
    })

    if (row.isDepartmentHead && row.academicDepartmentId) {
      const dept = await UsisAcademicDepartment.findOrFail(row.academicDepartmentId)
      dept.headPlatformUserId = row.platformUserId
      if (row.displayName) dept.headName = row.displayName
      await dept.save()
    }

    await auditLogService.log({
      organizationId,
      actorUserId,
      action: AuditAction.CREATE,
      entityType: 'usis_employee_assignment',
      entityId: row.id,
    })
    return row
  }

  async updateAssignment(
    organizationId: string,
    id: string,
    data: Partial<{
      displayName: string | null
      collegeId: string | null
      academicDepartmentId: string | null
      positionId: string | null
      isDepartmentHead: boolean
      isActive: boolean
    }>,
    actorUserId: string
  ) {
    const row = await UsisEmployeeAssignment.query()
      .where('organization_id', organizationId)
      .where('id', id)
      .firstOrFail()

    if (data.displayName !== undefined) row.displayName = data.displayName?.trim() || null
    if (data.collegeId !== undefined) row.collegeId = data.collegeId
    if (data.academicDepartmentId !== undefined) {
      row.academicDepartmentId = data.academicDepartmentId
    }
    if (data.positionId !== undefined) row.positionId = data.positionId
    if (data.isDepartmentHead !== undefined) row.isDepartmentHead = data.isDepartmentHead
    if (data.isActive !== undefined) row.isActive = data.isActive
    await row.save()

    if (row.isDepartmentHead && row.academicDepartmentId) {
      const dept = await UsisAcademicDepartment.findOrFail(row.academicDepartmentId)
      dept.headPlatformUserId = row.platformUserId
      if (row.displayName) dept.headName = row.displayName
      await dept.save()
    }

    await auditLogService.log({
      organizationId,
      actorUserId,
      action: AuditAction.UPDATE,
      entityType: 'usis_employee_assignment',
      entityId: row.id,
    })
    return row
  }
}

export const academicStructureService = new AcademicStructureService()
