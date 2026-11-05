import type Department from '#modules/documents/models/department'
import Document from '#modules/documents/models/document'
import WorkflowStep from '#modules/documents/models/workflow_step'
import RoutingEntry from '#modules/documents/models/routing_entry'
import { departmentRepository } from '#infrastructure/repositories/department_repository'
import { tenantContext } from '#modules/documents/domain/tenant_context'
import { auditService } from '#modules/documents/services/audit_service'
import { AuditAction } from '#modules/documents/domain/enums/index'
import {
  CatalogCodeAlreadyExistsException,
  CatalogEntityInUseException,
  CatalogEntityNotFoundException,
} from '#modules/documents/domain/exceptions/catalog_exceptions'

export interface CreateDepartmentInput {
  name: string
  code?: string | null
  description?: string | null
  isActive?: boolean
}

export interface UpdateDepartmentInput {
  name?: string
  code?: string | null
  description?: string | null
  isActive?: boolean
}

function normalizeCode(code?: string | null): string | null {
  if (code === undefined || code === null) return null
  const trimmed = code.trim()
  return trimmed.length > 0 ? trimmed.toUpperCase() : null
}

export class DepartmentService {
  serialize(department: Department) {
    return {
      id: department.id,
      name: department.name,
      code: department.code,
      description: department.description,
      isActive: department.isActive,
      createdAt: department.createdAt?.toISO() ?? null,
      updatedAt: department.updatedAt?.toISO() ?? null,
    }
  }

  async list() {
    return departmentRepository.listAll()
  }

  async findById(id: string): Promise<Department> {
    const department = await departmentRepository.findInTenant(id)
    if (!department) {
      throw new CatalogEntityNotFoundException('Department')
    }
    return department
  }

  private async assertUniqueCode(code: string | null, excludeId?: string) {
    if (!code) return
    const existing = await departmentRepository.findByCode(code, excludeId)
    if (existing) {
      throw new CatalogCodeAlreadyExistsException()
    }
  }

  async create(input: CreateDepartmentInput, userId: string): Promise<Department> {
    const tenantId = tenantContext.requireTenantId()
    const code = normalizeCode(input.code)

    await this.assertUniqueCode(code)

    const department = await departmentRepository.create({
      tenantId,
      name: input.name.trim(),
      code,
      description: input.description?.trim() ?? null,
      isActive: input.isActive ?? true,
      createdById: userId,
    })

    await auditService.log({
      tenantId,
      userId,
      action: AuditAction.CREATE,
      entityType: 'department',
      entityId: department.id,
      newValues: { name: department.name, code: department.code },
    })

    return department
  }

  async update(id: string, input: UpdateDepartmentInput, userId: string): Promise<Department> {
    const department = await this.findById(id)
    const tenantId = department.tenantId
    const oldValues = {
      name: department.name,
      code: department.code,
      isActive: department.isActive,
    }

    if (input.name !== undefined) department.name = input.name.trim()
    if (input.description !== undefined) department.description = input.description?.trim() ?? null
    if (input.isActive !== undefined) department.isActive = input.isActive

    if (input.code !== undefined) {
      const code = normalizeCode(input.code)
      await this.assertUniqueCode(code, department.id)
      department.code = code
    }

    department.updatedById = userId
    await departmentRepository.save(department)

    await auditService.log({
      tenantId,
      userId,
      action: AuditAction.UPDATE,
      entityType: 'department',
      entityId: department.id,
      oldValues,
      newValues: input as Record<string, unknown>,
    })

    return department
  }

  private async assertCanDeactivate(departmentId: string) {
    const tenantId = tenantContext.requireTenantId()

    const documents = await Document.query()
      .where('tenant_id', tenantId)
      .where('department_id', departmentId)
      .whereNull('deleted_at')
      .count('* as total')

    const documentCount = Number(documents[0]?.$extras.total ?? 0)
    if (documentCount > 0) {
      throw new CatalogEntityInUseException(
        `Cannot deactivate: used by ${documentCount} document${documentCount === 1 ? '' : 's'}`
      )
    }

    const workflowSteps = await WorkflowStep.query()
      .where('assignee_department_id', departmentId)
      .count('* as total')

    const stepCount = Number(workflowSteps[0]?.$extras.total ?? 0)
    if (stepCount > 0) {
      throw new CatalogEntityInUseException(
        `Cannot deactivate: referenced by ${stepCount} workflow step${stepCount === 1 ? '' : 's'}`
      )
    }

    const routingEntries = await RoutingEntry.query()
      .where('tenant_id', tenantId)
      .where((query) => {
        query.where('from_department_id', departmentId).orWhere('to_department_id', departmentId)
      })
      .count('* as total')

    const routingCount = Number(routingEntries[0]?.$extras.total ?? 0)
    if (routingCount > 0) {
      throw new CatalogEntityInUseException(
        `Cannot deactivate: referenced by ${routingCount} routing rule${routingCount === 1 ? '' : 's'}`
      )
    }
  }

  async deactivate(id: string, userId: string): Promise<void> {
    const department = await this.findById(id)
    await this.assertCanDeactivate(department.id)
    await departmentRepository.softDelete(department, userId)

    await auditService.log({
      tenantId: department.tenantId,
      userId,
      action: AuditAction.DELETE,
      entityType: 'department',
      entityId: department.id,
      oldValues: { name: department.name, code: department.code },
    })
  }
}

export const departmentService = new DepartmentService()
