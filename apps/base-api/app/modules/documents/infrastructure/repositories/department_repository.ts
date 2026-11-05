import { DateTime } from 'luxon'
import Department from '#modules/documents/models/department'
import { tenantContext } from '#modules/documents/domain/tenant_context'

export interface CreateDepartmentData {
  tenantId: string
  name: string
  code: string | null
  description: string | null
  isActive: boolean
  createdById: string
}

export class DepartmentRepository {
  async listActive() {
    const tenantId = tenantContext.requireTenantId()
    return Department.query()
      .where('tenant_id', tenantId)
      .where('is_active', true)
      .whereNull('deleted_at')
      .orderBy('name')
  }

  async listAll() {
    const tenantId = tenantContext.requireTenantId()
    return Department.query().where('tenant_id', tenantId).whereNull('deleted_at').orderBy('name')
  }

  async findInTenant(id: string): Promise<Department | null> {
    const tenantId = tenantContext.requireTenantId()
    return Department.query()
      .where('id', id)
      .where('tenant_id', tenantId)
      .whereNull('deleted_at')
      .first()
  }

  async findByCode(code: string, excludeId?: string): Promise<Department | null> {
    const tenantId = tenantContext.requireTenantId()
    const query = Department.query()
      .where('tenant_id', tenantId)
      .where('code', code)
      .whereNull('deleted_at')

    if (excludeId) {
      query.whereNot('id', excludeId)
    }

    return query.first()
  }

  async create(data: CreateDepartmentData): Promise<Department> {
    return Department.create({
      tenantId: data.tenantId,
      name: data.name,
      code: data.code,
      description: data.description,
      isActive: data.isActive,
      createdById: data.createdById,
      updatedById: data.createdById,
    })
  }

  async save(department: Department): Promise<Department> {
    await department.save()
    return department
  }

  async softDelete(department: Department, userId: string): Promise<void> {
    department.isActive = false
    department.deletedAt = DateTime.now()
    department.updatedById = userId
    await department.save()
  }
}

export const departmentRepository = new DepartmentRepository()
