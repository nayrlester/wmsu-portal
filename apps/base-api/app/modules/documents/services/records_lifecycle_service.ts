import { DateTime } from 'luxon'
import { Exception } from '@adonisjs/core/exceptions'
import {
  AuditAction,
  DocumentStatus,
  NotificationChannel,
  RecordsLifecycleStatus,
} from '#modules/documents/domain/enums/index'
import { NotificationTrigger } from '#modules/documents/domain/notifications/notification_types'
import { tenantContext } from '#modules/documents/domain/tenant_context'
import Document from '#modules/documents/models/document'
import User from '#modules/documents/models/user'
import { auditService } from '#modules/documents/services/audit_service'
import { notificationDispatcherService } from '#modules/documents/services/notification_dispatcher_service'
import { meilisearchService } from '#infrastructure/search/meilisearch_service'
import { cacheService } from '#infrastructure/cache/redis_cache_service'

export class LifecycleFanOutException extends Exception {
  static status = 422
  static code = 'E_LIFECYCLE_FANOUT'

  constructor(message: string) {
    super(message, { status: 422, code: 'E_LIFECYCLE_FANOUT' })
  }
}

/**
 * Single entry-point for document lifecycle / status transitions so
 * audit, notifications, dashboard cache, and search stay in sync.
 */
export class RecordsLifecycleService {
  async transitionLifecycle(
    document: Document,
    nextLifecycle: string,
    actor: User,
    options?: { reason?: string; notifyUserIds?: string[] }
  ) {
    if (document.legalHold && options?.reason === 'dispose') {
      throw new LifecycleFanOutException('Document is under legal hold and cannot be disposed')
    }

    const previous = document.lifecycleStatus
    const previousStatus = document.status
    document.lifecycleStatus = nextLifecycle
    if (nextLifecycle === RecordsLifecycleStatus.ARCHIVED) {
      document.archivedAt = DateTime.now()
      if (document.status !== DocumentStatus.ARCHIVED) {
        document.status = DocumentStatus.ARCHIVED
      }
    }
    await document.save()

    await this.fanOut({
      document,
      actor,
      action: AuditAction.LIFECYCLE_UPDATE,
      oldValues: { lifecycleStatus: previous, status: previousStatus },
      newValues: {
        lifecycleStatus: nextLifecycle,
        status: document.status,
        reason: options?.reason ?? null,
      },
      notifyTitle: `Lifecycle updated: ${document.trackingNumber}`,
      notifyBody: `${document.title} moved to ${nextLifecycle.replaceAll('_', ' ')}`,
      notifyUserIds: options?.notifyUserIds,
    })

    return document
  }

  async transitionStatus(
    document: Document,
    nextStatus: string,
    actor: User,
    options?: { reason?: string; notifyUserIds?: string[] }
  ) {
    const previous = document.status
    document.status = nextStatus
    if (nextStatus === DocumentStatus.SUBMITTED && !document.submittedAt) {
      document.submittedAt = DateTime.now()
    }
    if (nextStatus === DocumentStatus.COMPLETED) {
      document.completedAt = DateTime.now()
    }
    if (nextStatus === DocumentStatus.ARCHIVED) {
      document.archivedAt = DateTime.now()
      document.lifecycleStatus = RecordsLifecycleStatus.ARCHIVED
    }
    await document.save()

    await this.fanOut({
      document,
      actor,
      action: AuditAction.UPDATE,
      oldValues: { status: previous },
      newValues: { status: nextStatus, reason: options?.reason ?? null },
      notifyTitle: `Status updated: ${document.trackingNumber}`,
      notifyBody: `${document.title} is now ${nextStatus.replaceAll('_', ' ')}`,
      notifyUserIds: options?.notifyUserIds,
    })

    return document
  }

  private async fanOut(input: {
    document: Document
    actor: User
    action: string
    oldValues: Record<string, unknown>
    newValues: Record<string, unknown>
    notifyTitle: string
    notifyBody: string
    notifyUserIds?: string[]
  }) {
    const tenantId = tenantContext.requireTenantId()

    await auditService.log({
      tenantId,
      userId: input.actor.id,
      action: input.action as AuditAction,
      entityType: 'document',
      entityId: input.document.id,
      oldValues: input.oldValues,
      newValues: input.newValues,
    })

    const recipients = new Set<string>([
      input.document.createdById,
      input.document.assignedToId ?? '',
      ...(input.notifyUserIds ?? []),
    ])
    recipients.delete('')
    recipients.delete(input.actor.id)

    if (recipients.size) {
      await notificationDispatcherService.dispatch({
        tenantId,
        documentId: input.document.id,
        trigger: NotificationTrigger.EDITED,
        recipientUserIds: [...recipients],
        title: input.notifyTitle,
        body: input.notifyBody,
        channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
        data: {
          documentId: input.document.id,
          trackingNumber: input.document.trackingNumber,
          ...input.newValues,
        },
      })
    }

    try {
      await meilisearchService.syncDocument(tenantId, {
        id: input.document.id,
        title: input.document.title,
        trackingNumber: input.document.trackingNumber,
        status: input.document.status,
        snippet: input.document.description,
        matchField: 'title',
      })
    } catch {
      // Search index failures must not roll back lifecycle
    }

    await cacheService.forget(`cache:dashboard:stats:${tenantId}`)
    await cacheService.forget(`cache:dashboard:files-trend:${tenantId}:30`)
  }
}

export const recordsLifecycleService = new RecordsLifecycleService()
