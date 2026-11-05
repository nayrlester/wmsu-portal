import { DateTime } from 'luxon'
import { Exception } from '@adonisjs/core/exceptions'
import DocumentFilePlanNode from '#modules/documents/models/document_file_plan_node'
import { tenantContext } from '#modules/documents/domain/tenant_context'
import { auditService } from '#modules/documents/services/audit_service'
import { AuditAction } from '#modules/documents/domain/enums/index'

export class UdmsFilePlanValidationException extends Exception {
  constructor(message: string) {
    super(message, { status: 422, code: 'E_UDMS_FILE_PLAN_VALIDATION' })
  }
}

function slugifySegment(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'node'
}

export class UdmsFilePlanService {
  async list(parentId?: string | null) {
    const tenantId = tenantContext.requireTenantId()
    const q = DocumentFilePlanNode.query()
      .where('tenant_id', tenantId)
      .whereNull('deleted_at')
      .orderBy('sort_order', 'asc')
      .orderBy('name', 'asc')

    if (parentId === undefined) {
      // return all active nodes for tree building
    } else if (parentId === null) {
      q.whereNull('parent_id')
    } else {
      q.where('parent_id', parentId)
    }

    return q
  }

  async create(
    input: {
      name: string
      code?: string | null
      parentId?: string | null
      sortOrder?: number
    },
    actorUserId: string
  ) {
    const tenantId = tenantContext.requireTenantId()
    let parent: DocumentFilePlanNode | null = null
    if (input.parentId) {
      parent = await DocumentFilePlanNode.query()
        .where('tenant_id', tenantId)
        .where('id', input.parentId)
        .whereNull('deleted_at')
        .first()
      if (!parent) {
        throw new UdmsFilePlanValidationException('Parent file-plan node not found')
      }
    }

    const segment = slugifySegment(input.code?.trim() || input.name)
    const path = parent ? `${parent.path}/${segment}` : `/${segment}`

    const existing = await DocumentFilePlanNode.query()
      .where('tenant_id', tenantId)
      .where('path', path)
      .whereNull('deleted_at')
      .first()
    if (existing) {
      throw new UdmsFilePlanValidationException('A file-plan node with this path already exists')
    }

    const node = await DocumentFilePlanNode.create({
      tenantId,
      parentId: parent?.id ?? null,
      name: input.name.trim(),
      code: input.code?.trim() || null,
      path,
      sortOrder: input.sortOrder ?? 0,
      isActive: true,
    })

    await auditService.log({
      tenantId,
      userId: actorUserId,
      action: AuditAction.CREATE,
      entityType: 'document_file_plan_nodes',
      entityId: node.id,
      newValues: { name: node.name, path: node.path, parentId: node.parentId },
      metadata: { module: 'udms', prompt: '03' },
    })

    return node
  }

  async update(
    id: string,
    input: {
      name?: string
      code?: string | null
      sortOrder?: number
      isActive?: boolean
    },
    actorUserId: string
  ) {
    const tenantId = tenantContext.requireTenantId()
    const node = await DocumentFilePlanNode.query()
      .where('tenant_id', tenantId)
      .where('id', id)
      .whereNull('deleted_at')
      .first()
    if (!node) {
      throw new UdmsFilePlanValidationException('File-plan node not found')
    }

    const before = { name: node.name, code: node.code, sortOrder: node.sortOrder, isActive: node.isActive }
    if (input.name !== undefined) node.name = input.name.trim()
    if (input.code !== undefined) node.code = input.code
    if (input.sortOrder !== undefined) node.sortOrder = input.sortOrder
    if (input.isActive !== undefined) node.isActive = input.isActive
    await node.save()

    await auditService.log({
      tenantId,
      userId: actorUserId,
      action: AuditAction.UPDATE,
      entityType: 'document_file_plan_nodes',
      entityId: node.id,
      oldValues: before,
      newValues: {
        name: node.name,
        code: node.code,
        sortOrder: node.sortOrder,
        isActive: node.isActive,
      },
      metadata: { module: 'udms', prompt: '03' },
    })

    return node
  }

  async softDelete(id: string, actorUserId: string) {
    const tenantId = tenantContext.requireTenantId()
    const node = await DocumentFilePlanNode.query()
      .where('tenant_id', tenantId)
      .where('id', id)
      .whereNull('deleted_at')
      .first()
    if (!node) {
      throw new UdmsFilePlanValidationException('File-plan node not found')
    }

    const child = await DocumentFilePlanNode.query()
      .where('tenant_id', tenantId)
      .where('parent_id', id)
      .whereNull('deleted_at')
      .first()
    if (child) {
      throw new UdmsFilePlanValidationException('Cannot delete a file-plan node that has children')
    }

    node.deletedAt = DateTime.now()
    node.isActive = false
    await node.save()

    await auditService.log({
      tenantId,
      userId: actorUserId,
      action: AuditAction.DELETE,
      entityType: 'document_file_plan_nodes',
      entityId: node.id,
      oldValues: { path: node.path, name: node.name },
      metadata: { module: 'udms', prompt: '03' },
    })
  }

  async assertNode(id: string | null | undefined) {
    if (!id) return null
    const tenantId = tenantContext.requireTenantId()
    const node = await DocumentFilePlanNode.query()
      .where('tenant_id', tenantId)
      .where('id', id)
      .whereNull('deleted_at')
      .where('is_active', true)
      .first()
    if (!node) {
      throw new UdmsFilePlanValidationException('File-plan node not found')
    }
    return node
  }
}

export const udmsFilePlanService = new UdmsFilePlanService()
