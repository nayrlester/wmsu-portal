import db from '@adonisjs/lucid/services/db'
import { Exception } from '@adonisjs/core/exceptions'
import Document from '#modules/documents/models/document'
import User from '#modules/documents/models/user'
import Department from '#modules/documents/models/department'
import { ApprovalAction, AuditAction, DocumentStatus } from '#modules/documents/domain/enums/index'
import { tenantContext } from '#modules/documents/domain/tenant_context'
import { DocumentAccessPolicy } from '#modules/documents/domain/documents/document_access_policy'
import { DocumentConfidentialityPolicy } from '#modules/documents/domain/documents/document_confidentiality_policy'
import { DocumentSerializer } from '#presentation/documents/document_serializer'
import { documentRepository } from '#infrastructure/repositories/document_repository'
import { routingService } from '#modules/documents/services/routing_service'
import { approvalService } from '#modules/documents/services/approval_service'
import { workflowEngineService } from '#modules/documents/services/workflow_engine_service'
import { auditService } from '#modules/documents/services/audit_service'
import type { DocumentListFilters } from '#modules/documents/domain/documents/document_dto'

export class UdmsWorkflowValidationException extends Exception {
  constructor(message: string) {
    super(message, { status: 422, code: 'E_UDMS_WORKFLOW_VALIDATION' })
  }
}

const AWAITING_STATUSES = [
  DocumentStatus.SUBMITTED,
  DocumentStatus.RECEIVED,
  DocumentStatus.PENDING_REVIEW,
  DocumentStatus.PENDING_APPROVAL,
]

export class UdmsWorkflowService {
  async listAssigned(user: User, filters: DocumentListFilters & { officeId?: string }) {
    return this.paginateDocuments(
      {
        ...filters,
        assignedToId: user.id,
      },
      user.id
    )
  }

  async listOfficeQueue(user: User, filters: DocumentListFilters & { officeId?: string }) {
    if (!filters.officeId) {
      throw new UdmsWorkflowValidationException(
        'officeId is required for the office queue (user–office MDM mapping is For Clarification)'
      )
    }
    await this.assertDepartment(filters.officeId)

    const page = filters.page ?? 1
    const limit = Math.min(filters.limit ?? 25, 100)
    const tenantId = tenantContext.requireTenantId()

    const query = Document.query()
      .withScopes((scopes) => {
        scopes.forTenant()
        scopes.notDeleted()
      })
      .where('tenant_id', tenantId)
      .where((q) => {
        q.where('department_id', filters.officeId!)
          .orWhere('receiving_office_id', filters.officeId!)
          .orWhere('originating_office_id', filters.officeId!)
      })
      .preload('documentType')
      .preload('department')
      .preload('createdBy')
      .preload('assignedTo')
      .orderBy('updated_at', 'desc')

    if (filters.status) query.where('status', filters.status)
    if (filters.search?.trim()) {
      const term = filters.search.trim()
      query.where((sub) => {
        sub
          .whereILike('title', `%${term}%`)
          .orWhereILike('tracking_number', `%${term}%`)
          .orWhereILike('subject_keywords', `%${term}%`)
      })
    }

    documentRepository.applyDraftVisibilityScope(query, user.id)
    return query.paginate(page, limit)
  }

  async listAwaitingAction(user: User, filters: DocumentListFilters) {
    const page = filters.page ?? 1
    const limit = Math.min(filters.limit ?? 25, 100)
    const tenantId = tenantContext.requireTenantId()

    const candidates = await Document.query()
      .withScopes((scopes) => {
        scopes.forTenant()
        scopes.notDeleted()
      })
      .where('tenant_id', tenantId)
      .whereIn('status', AWAITING_STATUSES)
      .preload('documentType')
      .preload('department')
      .preload('createdBy')
      .preload('assignedTo')
      .orderBy('updated_at', 'desc')
      .limit(Math.min(limit * page * 3, 150))

    const actionable: Document[] = []
    for (const document of candidates) {
      if (!DocumentAccessPolicy.canView(document, user.id)) continue
      if (document.assignedToId && String(document.assignedToId) === String(user.id)) {
        actionable.push(document)
        continue
      }
      try {
        const state = await workflowEngineService.getDocumentWorkflowState(document.id, user)
        if (state.canCurrentUserAct) actionable.push(document)
      } catch {
        // skip documents without readable workflow state
      }
    }

    const start = (page - 1) * limit
    const slice = actionable.slice(start, start + limit)
    return {
      data: slice,
      meta: {
        total: actionable.length,
        perPage: limit,
        currentPage: page,
        lastPage: Math.max(1, Math.ceil(actionable.length / limit)),
      },
    }
  }

  async getTracking(documentId: string, user: User) {
    const document = await documentRepository.findByIdOrFail(documentId, user.id)
    await DocumentConfidentialityPolicy.assertCanView(
      document,
      user,
      tenantContext.requireTenantId()
    )

    const [timeline, activity, workflowState] = await Promise.all([
      approvalService.getTimeline(documentId, user.id),
      approvalService.getActivityFeed(documentId, user.id, 50),
      workflowEngineService.getDocumentWorkflowState(documentId, user),
    ])

    return {
      document: DocumentSerializer.serializeDetail(document),
      currentAssignment: {
        assignedToId: document.assignedToId,
        assignedTo: document.assignedTo
          ? {
              id: document.assignedTo.id,
              fullName: document.assignedTo.fullName,
              email: document.assignedTo.email,
            }
          : null,
        departmentId: document.departmentId,
        receivingOfficeId: document.receivingOfficeId,
        originatingOfficeId: document.originatingOfficeId,
        status: document.status,
      },
      workflow: {
        active: workflowState.active,
        canCurrentUserAct: workflowState.canCurrentUserAct,
        instance: workflowState.instance
          ? {
              id: workflowState.instance.id,
              status: workflowState.instance.status,
              currentNodeId: workflowState.instance.currentNodeId,
            }
          : null,
      },
      timeline: timeline.timeline ?? timeline,
      activity: activity.activity ?? activity,
      policyNotes: {
        escalationRules: 'For Clarification — TOR requires escalation; timers/targets not defined',
        defaultWorkflowGraphs: 'For Clarification — use tenant-configured workflows only',
      },
    }
  }

  async assign(
    documentId: string,
    input: { toUserId: string; toOfficeId?: string; remarks?: string },
    actor: User
  ) {
    const tenantId = tenantContext.requireTenantId()
    await this.assertUser(input.toUserId)
    if (input.toOfficeId) await this.assertDepartment(input.toOfficeId)

    await db.transaction(async (trx) => {
      const document = await Document.query({ client: trx })
        .where('tenant_id', tenantId)
        .where('id', documentId)
        .whereNull('deleted_at')
        .firstOrFail()

      DocumentAccessPolicy.assertCanModify(document, actor.id)

      const previous = {
        assignedToId: document.assignedToId,
        departmentId: document.departmentId,
        receivingOfficeId: document.receivingOfficeId,
      }

      document.assignedToId = input.toUserId
      if (input.toOfficeId) {
        document.departmentId = input.toOfficeId
        document.receivingOfficeId = input.toOfficeId
      }
      document.useTransaction(trx)
      await document.save()

      await routingService.record({
        tenantId,
        documentId: document.id,
        action: 'assign',
        fromUserId: actor.id,
        toUserId: input.toUserId,
        fromDepartmentId: previous.departmentId,
        toDepartmentId: input.toOfficeId ?? document.departmentId,
        remarks: input.remarks ?? null,
        metadata: { module: 'udms', prompt: '04' },
      })

      await auditService.log({
        tenantId,
        userId: actor.id,
        action: AuditAction.UPDATE,
        entityType: 'document',
        entityId: document.id,
        oldValues: previous,
        newValues: {
          assignedToId: document.assignedToId,
          departmentId: document.departmentId,
          receivingOfficeId: document.receivingOfficeId,
        },
        metadata: { module: 'udms', prompt: '04', tor: 'DMS-007', action: 'assign' },
      })
    })

    return documentRepository.findByIdOrFail(documentId, actor.id)
  }

  async route(
    documentId: string,
    input: { toUserId?: string; toOfficeId?: string; remarks: string },
    actor: User
  ) {
    if (!input.toUserId && !input.toOfficeId) {
      throw new UdmsWorkflowValidationException('Provide toUserId and/or toOfficeId')
    }
    if (input.toUserId) await this.assertUser(input.toUserId)
    if (input.toOfficeId) await this.assertDepartment(input.toOfficeId)

    const tenantId = tenantContext.requireTenantId()

    await db.transaction(async (trx) => {
      const document = await Document.query({ client: trx })
        .where('tenant_id', tenantId)
        .where('id', documentId)
        .whereNull('deleted_at')
        .firstOrFail()

      DocumentAccessPolicy.assertCanModify(document, actor.id)

      if (document.status === DocumentStatus.DRAFT) {
        throw new UdmsWorkflowValidationException(
          'Submit the document before routing (draft documents are not in workflow)'
        )
      }
      if (document.status === DocumentStatus.ARCHIVED) {
        throw new UdmsWorkflowValidationException('Archived documents cannot be routed')
      }

      const previous = {
        assignedToId: document.assignedToId,
        departmentId: document.departmentId,
        receivingOfficeId: document.receivingOfficeId,
      }

      if (input.toUserId) document.assignedToId = input.toUserId
      if (input.toOfficeId) {
        document.receivingOfficeId = input.toOfficeId
        document.departmentId = input.toOfficeId
      }
      document.useTransaction(trx)
      await document.save()

      await routingService.record({
        tenantId,
        documentId: document.id,
        action: ApprovalAction.FORWARD,
        fromUserId: actor.id,
        toUserId: input.toUserId ?? document.assignedToId,
        fromDepartmentId: previous.receivingOfficeId ?? previous.departmentId,
        toDepartmentId: input.toOfficeId ?? document.receivingOfficeId,
        remarks: input.remarks,
        metadata: { module: 'udms', prompt: '04', tor: 'DMS-007' },
      })

      await auditService.log({
        tenantId,
        userId: actor.id,
        action: AuditAction.FORWARD,
        entityType: 'document',
        entityId: document.id,
        oldValues: previous,
        newValues: {
          assignedToId: document.assignedToId,
          departmentId: document.departmentId,
          receivingOfficeId: document.receivingOfficeId,
        },
        metadata: { module: 'udms', prompt: '04', tor: 'DMS-007', action: 'route' },
      })
    })

    return documentRepository.findByIdOrFail(documentId, actor.id)
  }

  async act(
    documentId: string,
    input: {
      action: ApprovalAction
      comments?: string | null
      stepNodeId?: string | null
      toUserId?: string | null
      versionId?: string | null
    },
    actor: User
  ) {
    return approvalService.processAction({
      documentId,
      userId: actor.id,
      action: input.action,
      comments: input.comments,
      stepNodeId: input.stepNodeId,
      toUserId: input.toUserId,
      versionId: input.versionId,
    })
  }

  serializePage(page: { all?: () => Document[]; getMeta?: () => unknown; data?: Document[]; meta?: unknown }) {
    if (typeof page.all === 'function' && typeof page.getMeta === 'function') {
      return DocumentSerializer.serializePaginated(page as any)
    }
    return {
      data: (page.data ?? []).map((doc) => DocumentSerializer.serialize(doc)),
      meta: page.meta,
    }
  }

  private async paginateDocuments(
    filters: DocumentListFilters & { assignedToId?: string },
    viewerUserId: string
  ) {
    const page = filters.page ?? 1
    const limit = Math.min(filters.limit ?? 25, 100)
    const tenantId = tenantContext.requireTenantId()

    const query = Document.query()
      .withScopes((scopes) => {
        scopes.forTenant()
        scopes.notDeleted()
      })
      .where('tenant_id', tenantId)
      .preload('documentType')
      .preload('department')
      .preload('createdBy')
      .preload('assignedTo')
      .orderBy('updated_at', 'desc')

    if (filters.assignedToId) query.where('assigned_to_id', filters.assignedToId)
    if (filters.status) query.where('status', filters.status)
    if (filters.search?.trim()) {
      const term = filters.search.trim()
      query.where((sub) => {
        sub.whereILike('title', `%${term}%`).orWhereILike('tracking_number', `%${term}%`)
      })
    }

    documentRepository.applyDraftVisibilityScope(query, viewerUserId)
    return query.paginate(page, limit)
  }

  private async assertUser(userId: string) {
    const tenantId = tenantContext.requireTenantId()
    const user = await User.query().where('id', userId).where('tenant_id', tenantId).first()
    if (!user) throw new UdmsWorkflowValidationException('Target user not found in this tenant')
    return user
  }

  private async assertDepartment(departmentId: string) {
    const tenantId = tenantContext.requireTenantId()
    const dept = await Department.query()
      .where('id', departmentId)
      .where('tenant_id', tenantId)
      .where('is_active', true)
      .first()
    if (!dept) throw new UdmsWorkflowValidationException('Target office/department not found')
    return dept
  }
}

export const udmsWorkflowService = new UdmsWorkflowService()
