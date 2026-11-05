import AuditLog from '#modules/documents/models/audit_log'
import User from '#modules/documents/models/user'
import { documentRepository } from '#infrastructure/repositories/document_repository'
import { approvalRepository } from '#infrastructure/repositories/approval_repository'
import { routingService } from '#modules/documents/services/routing_service'
import type {
  ActivityFeedItem,
  ApprovalHistoryEntry,
} from '#modules/documents/domain/routing/routing_types'
import { tenantContext } from '#modules/documents/domain/tenant_context'

function formatAuditRemarks(log: AuditLog): string | null {
  const newValues = log.newValues ?? {}
  const oldValues = log.oldValues ?? {}
  const metadata = log.metadata ?? {}

  if (log.entityType === 'document_file') {
    if (log.action === 'upload') {
      return `Uploaded "${String(newValues.originalName ?? 'file')}"`
    }
    if (log.action === 'download') {
      return `Downloaded "${String(newValues.originalName ?? 'file')}"`
    }
    if (log.action === 'delete') {
      return `Deleted "${String(oldValues.originalName ?? 'file')}"`
    }
    if (log.action === 'update' && metadata.reason === 'file_replaced') {
      return `File superseded by a newer version`
    }
  }

  if (log.entityType === 'document_version' && log.action === 'create') {
    const versionLabel =
      typeof newValues.versionLabel === 'string'
        ? newValues.versionLabel
        : `v${String(newValues.versionNumber ?? '')}`
    const changeNotes = newValues.changeNotes
    if (metadata.reason === 'file_replace' || newValues.replacedFileName) {
      return `Created ${versionLabel} — replaced "${String(newValues.replacedFileName ?? 'file')}"`
    }
    return changeNotes
      ? `Created ${versionLabel} — ${String(changeNotes)}`
      : `Created version ${versionLabel}`
  }

  if (log.entityType === 'document') {
    if (log.action === 'create') return 'Document created'
    if (log.action === 'update') return 'Document updated'
    if (log.action === 'delete') return 'Document deleted'
  }

  return null
}

export class DocumentActivityService {
  async getTimeline(documentId: string, viewerUserId: string) {
    await documentRepository.findByIdOrFail(documentId, viewerUserId)
    const timeline = await routingService.getTimeline(documentId)
    return { timeline }
  }

  async getApprovalHistory(documentId: string, viewerUserId: string) {
    await documentRepository.findByIdOrFail(documentId, viewerUserId)
    const approvals = await approvalRepository.listByDocument(documentId)
    return {
      approvals: approvals.map((approval) => this.serializeApproval(approval)),
    }
  }

  async getActivityFeed(documentId: string, viewerUserId: string, limit = 50): Promise<{ activity: ActivityFeedItem[] }> {
    await documentRepository.findByIdOrFail(documentId, viewerUserId)
    const tenantId = tenantContext.requireTenantId()

    const [routingTimeline, approvals, auditLogs] = await Promise.all([
      routingService.getTimeline(documentId),
      approvalRepository.listByDocument(documentId),
      AuditLog.query()
        .where('tenant_id', tenantId)
        .where((builder) => {
          builder
            .where((group) => {
              group.where('entity_type', 'document').where('entity_id', documentId)
            })
            .orWhere((group) => {
              group
                .whereIn('entity_type', ['document_file', 'document_version'])
                .whereRaw(`coalesce(new_values->>'documentId', metadata->>'documentId') = ?`, [
                  documentId,
                ])
            })
        })
        .orderBy('created_at', 'desc')
        .limit(limit),
    ])

    const userIds = [...new Set(auditLogs.map((log) => log.userId).filter(Boolean))] as string[]
    const users =
      userIds.length > 0
        ? await User.query().whereIn('id', userIds).whereNull('deleted_at')
        : []
    const userMap = new Map(users.map((user) => [user.id, user]))

    const activity: ActivityFeedItem[] = [
      ...routingTimeline.map((entry) => ({
        id: `routing:${entry.id}`,
        type: 'routing' as const,
        action: entry.action,
        occurredAt: entry.routedAt,
        fromUser: entry.fromUser,
        toUser: entry.toUser,
        remarks: entry.remarks,
        metadata: null,
      })),
      ...approvals.map((approval) => ({
        id: `approval:${approval.id}`,
        type: 'approval' as const,
        action: approval.action,
        occurredAt: approval.actedAt.toISO()!,
        fromUser: approval.approver
          ? {
              id: approval.approver.id,
              fullName: approval.approver.fullName,
              email: approval.approver.email,
            }
          : null,
        toUser: null,
        remarks: approval.comments,
        stepNodeId: approval.stepNodeId,
        metadata: { workflowInstanceId: approval.workflowInstanceId },
      })),
      ...auditLogs.map((log) => {
        const actor = log.userId ? userMap.get(log.userId) : null
        return {
          id: `audit:${log.id}`,
          type: 'audit' as const,
          action: log.action,
          occurredAt: log.createdAt.toISO()!,
          fromUser: actor
            ? {
                id: actor.id,
                fullName: actor.fullName,
                email: actor.email,
              }
            : null,
          toUser: null,
          remarks: formatAuditRemarks(log),
          metadata: {
            ...(log.metadata ?? {}),
            entityType: log.entityType,
            entityId: log.entityId,
            oldValues: log.oldValues,
            newValues: log.newValues,
          },
        }
      }),
    ]

    activity.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())

    return { activity: activity.slice(0, limit) }
  }

  private serializeApproval(approval: Awaited<ReturnType<typeof approvalRepository.listByDocument>>[number]): ApprovalHistoryEntry {
    return {
      id: approval.id,
      action: approval.action,
      comments: approval.comments,
      stepNodeId: approval.stepNodeId,
      actedAt: approval.actedAt.toISO()!,
      approver: approval.approver
        ? {
            id: approval.approver.id,
            fullName: approval.approver.fullName,
            email: approval.approver.email,
          }
        : null,
      workflowInstanceId: approval.workflowInstanceId,
    }
  }
}

export const documentActivityService = new DocumentActivityService()
