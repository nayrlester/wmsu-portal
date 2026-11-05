import logger from '@adonisjs/core/services/logger'
import type Document from '#modules/documents/models/document'
import type { WorkflowNodeDef } from '#modules/documents/domain/workflows/workflow_types'
import { NotificationChannel } from '#modules/documents/domain/enums/index'
import { notificationDispatcherService } from '#modules/documents/services/notification_dispatcher_service'
import { NotificationTrigger } from '#modules/documents/domain/notifications/notification_types'
import { auditService } from '#modules/documents/services/audit_service'

export type WorkflowStepAction =
  | { type: 'notify'; channel?: 'in_app' | 'email'; message?: string }
  | { type: 'webhook'; url: string; method?: 'POST' | 'PUT'; headers?: Record<string, string> }
  | { type: 'sms'; message?: string }

/**
 * Execute BPM step side-effects (notify / webhook / SMS log).
 * SMS is audited until a carrier adapter is configured.
 */
export async function executeWorkflowStepActions(input: {
  document: Document
  node: WorkflowNodeDef
  recipientUserIds: string[]
}): Promise<void> {
  const actions = (input.node as WorkflowNodeDef & { actions?: WorkflowStepAction[] }).actions
  if (!actions?.length) return

  for (const action of actions) {
    try {
      if (action.type === 'notify') {
        const channels =
          action.channel === 'email'
            ? [NotificationChannel.IN_APP, NotificationChannel.EMAIL]
            : [NotificationChannel.IN_APP]

        await notificationDispatcherService.dispatch({
          tenantId: input.document.tenantId,
          documentId: input.document.id,
          trigger: NotificationTrigger.WORKFLOW_STEP,
          recipientUserIds: input.recipientUserIds,
          title: `Workflow: ${input.node.name}`,
          body:
            action.message?.trim() ||
            `Document ${input.document.trackingNumber} reached step "${input.node.name}".`,
          data: {
            documentId: input.document.id,
            nodeId: input.node.id,
            channel: action.channel ?? 'in_app',
          },
          channels,
        })
        continue
      }

      if (action.type === 'webhook') {
        const method = action.method ?? 'POST'
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 8_000)
        try {
          const res = await fetch(action.url, {
            method,
            headers: {
              'Content-Type': 'application/json',
              ...(action.headers ?? {}),
            },
            body: JSON.stringify({
              event: 'workflow.step.activated',
              documentId: input.document.id,
              trackingNumber: input.document.trackingNumber,
              nodeId: input.node.id,
              nodeName: input.node.name,
              tenantId: input.document.tenantId,
            }),
            signal: controller.signal,
          })
          await auditService.log({
            tenantId: input.document.tenantId,
            action: 'workflow.webhook',
            entityType: 'document',
            entityId: input.document.id,
            metadata: {
              nodeId: input.node.id,
              url: action.url,
              status: res.status,
              ok: res.ok,
            },
          })
        } finally {
          clearTimeout(timeout)
        }
        continue
      }

      if (action.type === 'sms') {
        logger.info(
          {
            documentId: input.document.id,
            nodeId: input.node.id,
            recipients: input.recipientUserIds.length,
          },
          '[WorkflowActions] SMS action queued (adapter not configured — audited only)'
        )
        await auditService.log({
          tenantId: input.document.tenantId,
          action: 'workflow.sms_stub',
          entityType: 'document',
          entityId: input.document.id,
          metadata: {
            nodeId: input.node.id,
            message: action.message ?? null,
            recipientCount: input.recipientUserIds.length,
          },
        })
      }
    } catch (error) {
      logger.warn(
        { err: error, nodeId: input.node.id, actionType: action.type },
        '[WorkflowActions] step action failed'
      )
    }
  }
}
