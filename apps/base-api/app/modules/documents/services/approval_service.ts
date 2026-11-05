import User from '#modules/documents/models/user'
import { ApprovalAction, AuditAction, EsignEnvelopeStatus } from '#modules/documents/domain/enums/index'
import {
  EsignRequiredException,
  InvalidForwardTargetException,
  RejectReasonRequiredException,
} from '#modules/documents/domain/routing/routing_exceptions'
import { workflowEngineService } from '#modules/documents/services/workflow_engine_service'
import { documentActivityService } from '#modules/documents/services/document_activity_service'
import { tenantContext } from '#modules/documents/domain/tenant_context'
import { pandadocClient } from '#infrastructure/pandadoc/pandadoc_client'
import EsignEnvelope from '#modules/documents/models/esign_envelope'
import env from '#start/env'

export interface ProcessApprovalInput {
  documentId: string
  userId: string
  action: ApprovalAction
  comments?: string | null
  stepNodeId?: string | null
  toUserId?: string | null
  versionId?: string | null
}

export class ApprovalService {
  async processAction(input: ProcessApprovalInput) {
    const user = await User.findOrFail(input.userId)

    if (input.action === ApprovalAction.FORWARD) {
      if (!input.toUserId) {
        throw new InvalidForwardTargetException('toUserId is required when forwarding')
      }

      await this.assertForwardTarget(input.toUserId)
    }

    if (input.action === ApprovalAction.REJECT && !input.comments?.trim()) {
      throw new RejectReasonRequiredException()
    }

    if (input.action === ApprovalAction.APPROVE) {
      await this.assertEsignCompleted(input.documentId)
    }

    const result = await workflowEngineService.processApprovalAction(
      input.documentId,
      user,
      input.action,
      input.comments ?? null,
      input.stepNodeId ?? null,
      input.toUserId ?? null,
      input.versionId ?? null
    )

    return result
  }

  private async assertEsignCompleted(documentId: string): Promise<void> {
    const enabled = env.get('PANDADOC_ENABLED')
    if (enabled === false || !pandadocClient.isConfigured()) {
      return
    }

    const tenantId = tenantContext.requireTenantId()
    const completed = await EsignEnvelope.query()
      .where('tenant_id', tenantId)
      .where('document_id', documentId)
      .where('status', EsignEnvelopeStatus.COMPLETED)
      .first()

    if (!completed) {
      throw new EsignRequiredException()
    }
  }

  async getApprovalHistory(documentId: string, viewerUserId: string) {
    return documentActivityService.getApprovalHistory(documentId, viewerUserId)
  }

  async getTimeline(documentId: string, viewerUserId: string) {
    return documentActivityService.getTimeline(documentId, viewerUserId)
  }

  async getActivityFeed(documentId: string, viewerUserId: string, limit?: number) {
    return documentActivityService.getActivityFeed(documentId, viewerUserId, limit)
  }

  async processBulk(input: {
    documentIds: string[]
    userId: string
    action: ApprovalAction
    comments?: string | null
  }) {
    const results: Array<{
      documentId: string
      ok: boolean
      error?: string
      completed?: boolean
    }> = []

    for (const documentId of input.documentIds) {
      try {
        const result = await this.processAction({
          documentId,
          userId: input.userId,
          action: input.action,
          comments: input.comments ?? null,
        })
        results.push({ documentId, ok: true, completed: result.completed })
      } catch (error) {
        results.push({
          documentId,
          ok: false,
          error: error instanceof Error ? error.message : 'Approval failed',
        })
      }
    }

    return {
      processed: results.length,
      succeeded: results.filter((r) => r.ok).length,
      failed: results.filter((r) => !r.ok).length,
      results,
    }
  }

  private async assertForwardTarget(toUserId: string): Promise<void> {
    const tenantId = tenantContext.requireTenantId()
    const target = await User.query()
      .where('id', toUserId)
      .where('tenant_id', tenantId)
      .whereNull('deleted_at')
      .where('status', 'active')
      .first()

    if (!target) {
      throw new InvalidForwardTargetException()
    }
  }
}

export const approvalService = new ApprovalService()

export function mapApprovalActionToAuditAction(action: ApprovalAction): AuditAction {
  switch (action) {
    case ApprovalAction.APPROVE:
      return AuditAction.APPROVE
    case ApprovalAction.REJECT:
      return AuditAction.REJECT
    case ApprovalAction.RETURN:
      return AuditAction.RETURN
    case ApprovalAction.FORWARD:
      return AuditAction.FORWARD
    default:
      return AuditAction.UPDATE
  }
}
