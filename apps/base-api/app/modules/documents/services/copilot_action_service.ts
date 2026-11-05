import { randomUUID } from 'node:crypto'
import User from '#modules/documents/models/user'
import { ApprovalAction, AuditAction } from '#modules/documents/domain/enums/index'
import {
  CopilotActionType,
  COPILOT_ENTITY_TYPE,
  type CopilotCard,
  type CopilotConfirmResponse,
  type CopilotPendingAction,
  type CopilotUserContext,
} from '#modules/documents/domain/copilot/copilot_types'
import { documentRepository } from '#infrastructure/repositories/document_repository'
import { documentService } from '#modules/documents/services/document_service'
import { approvalService } from '#modules/documents/services/approval_service'
import { auditService } from '#modules/documents/services/audit_service'
import { documentIntelligenceService } from '#modules/documents/services/document_intelligence_service'
import { IntelligenceTask } from '#modules/documents/domain/intelligence/intelligence_types'
import { tenantContext } from '#modules/documents/domain/tenant_context'
import { DocumentNotFoundException } from '#modules/documents/domain/documents/document_exceptions'

interface StoredPendingAction extends CopilotPendingAction {
  userId: string
  tenantId: string
  prompt: string
  intent: string
  expiresAt: number
}

const PENDING_TTL_MS = 5 * 60 * 1000
const pendingActions = new Map<string, StoredPendingAction>()

export class CopilotActionService {
  createPendingAction(input: {
    userContext: CopilotUserContext
    prompt: string
    intent: string
    action: Omit<CopilotPendingAction, 'id'>
  }): CopilotPendingAction {
    this.pruneExpired()

    const id = randomUUID()
    const pending: StoredPendingAction = {
      ...input.action,
      id,
      userId: input.userContext.userId,
      tenantId: input.userContext.tenantId,
      prompt: input.prompt,
      intent: input.intent,
      expiresAt: Date.now() + PENDING_TTL_MS,
    }

    pendingActions.set(id, pending)

    return {
      id: pending.id,
      type: pending.type,
      label: pending.label,
      description: pending.description,
      confirmLabel: pending.confirmLabel,
      cancelLabel: pending.cancelLabel,
      payload: pending.payload,
      requiredPermission: pending.requiredPermission,
    }
  }

  cancelPendingAction(actionId: string, userId: string, tenantId: string): boolean {
    const pending = pendingActions.get(actionId)
    if (!pending || pending.userId !== userId || pending.tenantId !== tenantId) {
      return false
    }
    pendingActions.delete(actionId)
    return true
  }

  async confirmAction(
    actionId: string,
    userContext: CopilotUserContext,
    ipAddress?: string | null,
    userAgent?: string | null
  ): Promise<CopilotConfirmResponse> {
    this.pruneExpired()

    const pending = pendingActions.get(actionId)
    if (!pending) {
      return { success: false, message: "That timed out — just ask again when you're ready." }
    }

    if (pending.userId !== userContext.userId || pending.tenantId !== userContext.tenantId) {
      return { success: false, message: "That action isn't yours to confirm." }
    }

    if (pending.requiredPermission && !this.hasPermission(userContext, pending.requiredPermission)) {
      return {
        success: false,
        message: "Your account doesn't have access to do that.",
      }
    }

    pendingActions.delete(actionId)

    try {
      const result = await this.executeAction(pending, userContext)
      await this.logAiAction({
        tenantId: userContext.tenantId,
        userId: userContext.userId,
        prompt: pending.prompt,
        intent: pending.intent,
        actionType: pending.type,
        payload: pending.payload,
        ipAddress,
        userAgent,
      })
      return result
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Action failed'
      return { success: false, message }
    }
  }

  private async executeAction(
    pending: StoredPendingAction,
    userContext: CopilotUserContext
  ): Promise<CopilotConfirmResponse> {
    switch (pending.type) {
      case CopilotActionType.APPROVE:
        return this.executeApproval(pending, ApprovalAction.APPROVE, userContext)
      case CopilotActionType.REJECT:
        return this.executeApproval(pending, ApprovalAction.REJECT, userContext)
      case CopilotActionType.RETURN:
        return this.executeApproval(pending, ApprovalAction.RETURN, userContext)
      case CopilotActionType.CREATE_DOCUMENT:
        return this.executeCreateDocument(pending, userContext)
      case CopilotActionType.TRIGGER_INTELLIGENCE:
        return this.executeIntelligence(pending, userContext)
      default:
        return { success: false, message: "Can't do that one yet." }
    }
  }

  private async executeApproval(
    pending: StoredPendingAction,
    action: ApprovalAction,
    userContext: CopilotUserContext
  ): Promise<CopilotConfirmResponse> {
    const documentId = pending.payload.documentId as string
    await approvalService.processAction({
      documentId,
      userId: userContext.userId,
      action,
      comments: (pending.payload.comments as string | undefined) ?? 'Confirmed from chat',
    })

    const document = await documentRepository.findByIdOrFail(documentId)
    const verb = action === ApprovalAction.APPROVE ? 'approved' : action === ApprovalAction.REJECT ? 'rejected' : 'sent back'

    return {
      success: true,
      message: `Done — ${document.trackingNumber} has been ${verb}.`,
      href: `/app/documents/${document.id}`,
      cards: [this.documentCard(document)],
    }
  }

  private async executeCreateDocument(
    pending: StoredPendingAction,
    userContext: CopilotUserContext
  ): Promise<CopilotConfirmResponse> {
    const title = (pending.payload.title as string) || 'Untitled Document'
    const document = await documentService.create({ title }, userContext.userId)

    return {
      success: true,
      message: `All set — draft created as ${document.trackingNumber}.`,
      href: `/app/documents/${document.id}`,
      cards: [this.documentCard(document)],
    }
  }

  private async executeIntelligence(
    pending: StoredPendingAction,
    userContext: CopilotUserContext
  ): Promise<CopilotConfirmResponse> {
    const documentId = pending.payload.documentId as string
    const fileId = pending.payload.fileId as string

    await documentIntelligenceService.enqueueAnalysis({
      tenantId: userContext.tenantId,
      documentId,
      fileId,
      tasks: [IntelligenceTask.SUMMARIZE],
    })

    const document = await documentRepository.findByIdOrFail(documentId)

    return {
      success: true,
      message: `Working on a summary for ${document.trackingNumber} — it'll show up on the document in a bit.`,
      href: `/app/documents/${document.id}`,
    }
  }

  async resolveDocumentRef(input: {
    documentId?: string
    trackingNumber?: string
    refId?: string
    refType?: string
  }) {
    if (input.refType === 'document' && input.refId) {
      return documentRepository.findByIdOrFail(input.refId)
    }

    if (input.documentId) {
      return documentRepository.findByIdOrFail(input.documentId)
    }

    if (input.trackingNumber) {
      return documentRepository.findByTrackingNumber(input.trackingNumber.toUpperCase())
    }

    throw new DocumentNotFoundException()
  }

  documentCard(document: {
    id: string
    title: string
    trackingNumber: string
    status: string
    department?: { name: string } | null
  }): CopilotCard {
    return {
      id: document.id,
      type: 'document',
      title: document.title,
      subtitle: document.trackingNumber,
      description: document.department?.name ?? undefined,
      href: `/app/documents/${document.id}`,
      metadata: { status: document.status },
    }
  }

  hasPermission(userContext: CopilotUserContext, permission: string): boolean {
    if (userContext.roles.includes('super_admin') || userContext.roles.includes('tenant_owner')) {
      return true
    }
    return userContext.permissions.includes(permission)
  }

  async buildUserContext(user: User, tenantId: string): Promise<CopilotUserContext> {
    const permissions: string[] = []
    const permissionSlugs = [
      'documents.view',
      'documents.create',
      'documents.update',
      'documents.delete',
      'documents.download',
      'documents.approve',
      'workflows.manage',
      'users.manage',
      'reports.view',
      'audit.view',
      'settings.manage',
    ]

    if (user.isSuperAdmin) {
      return {
        userId: user.id,
        tenantId,
        fullName: user.fullName,
        email: user.email,
        roles: ['super_admin'],
        permissions: permissionSlugs,
      }
    }

    await user.load('roles')
    const roles = user.roles.map((role) => role.slug)

    for (const slug of permissionSlugs) {
      if (await user.hasPermission(slug, tenantId)) {
        permissions.push(slug)
      }
    }

    return {
      userId: user.id,
      tenantId,
      fullName: user.fullName,
      email: user.email,
      roles,
      permissions,
    }
  }

  private async logAiAction(input: {
    tenantId: string
    userId: string
    prompt: string
    intent: string
    actionType: CopilotActionType
    payload: Record<string, unknown>
    ipAddress?: string | null
    userAgent?: string | null
  }) {
    await auditService.log({
      tenantId: input.tenantId,
      userId: input.userId,
      action: AuditAction.AI_ASSISTANT,
      entityType: COPILOT_ENTITY_TYPE,
      metadata: {
        prompt: input.prompt,
        intent: input.intent,
        actionType: input.actionType,
        payload: input.payload,
        category: 'AI_ASSISTANT',
      },
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    })
  }

  private pruneExpired() {
    const now = Date.now()
    for (const [id, action] of pendingActions.entries()) {
      if (action.expiresAt <= now) pendingActions.delete(id)
    }
  }
}

export const copilotActionService = new CopilotActionService()
