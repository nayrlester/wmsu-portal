import { DateTime } from 'luxon'
import emitter from '@adonisjs/core/services/emitter'
import Document from '#modules/documents/models/document'
import DocumentSlaTracking from '#modules/documents/models/document_sla_tracking'
import SlaRule from '#modules/documents/models/sla_rule'
import User from '#modules/documents/models/user'
import { NotificationTrigger } from '#modules/documents/domain/notifications/notification_types'
import { notificationDispatcherService } from '#modules/documents/services/notification_dispatcher_service'
import { DefaultRoleSlug } from '#modules/documents/domain/enums/index'
import Role from '#modules/documents/models/role'

type EscalationRules = {
  remindHoursBefore?: number
  escalateToAdmin?: boolean
  escalateToRoleSlug?: string
}

export class SlaService {
  async initializeForDocument(document: Document): Promise<void> {
    if (!document.documentTypeId) return

    const rule = await SlaRule.query()
      .where('tenant_id', document.tenantId)
      .where('is_active', true)
      .where((query) => {
        query.whereNull('document_type_id').orWhere('document_type_id', document.documentTypeId!)
      })
      .orderBy('document_type_id', 'desc')
      .first()

    if (!rule) return

    const now = DateTime.now()
    await DocumentSlaTracking.updateOrCreate(
      { documentId: document.id },
      {
        documentId: document.id,
        slaRuleId: rule.id,
        reviewDueAt: rule.reviewDeadlineHours ? now.plus({ hours: rule.reviewDeadlineHours }) : null,
        approvalDueAt: rule.approvalDeadlineHours ? now.plus({ hours: rule.approvalDeadlineHours }) : null,
        completionDueAt: rule.completionDeadlineHours
          ? now.plus({ hours: rule.completionDeadlineHours })
          : null,
        isBreached: false,
      }
    )
  }

  async checkBreaches(): Promise<number> {
    const reminderCount = await this.checkReminders()
    const now = DateTime.now()
    const dueRecords = await DocumentSlaTracking.query()
      .where('is_breached', false)
      .where((query) => {
        query
          .where((inner) => {
            inner.whereNotNull('review_due_at').where('review_due_at', '<=', now.toSQL()!)
          })
          .orWhere((inner) => {
            inner.whereNotNull('approval_due_at').where('approval_due_at', '<=', now.toSQL()!)
          })
          .orWhere((inner) => {
            inner.whereNotNull('completion_due_at').where('completion_due_at', '<=', now.toSQL()!)
          })
      })
      .preload('document')
      .preload('slaRule')

    let breachCount = 0

    for (const record of dueRecords) {
      const document = record.document
      if (!document) continue

      record.isBreached = true
      record.breachedAt = now
      await record.save()
      breachCount += 1

      const recipientIds = await this.resolveSlaRecipients(document.tenantId, document)

      await notificationDispatcherService.dispatch({
        tenantId: document.tenantId,
        documentId: document.id,
        trigger: NotificationTrigger.SLA_BREACH,
        recipientUserIds: recipientIds,
        title: `SLA breach: ${document.title}`,
        body: `Document ${document.trackingNumber} has exceeded its SLA deadline.`,
        data: {
          documentId: document.id,
          trackingNumber: document.trackingNumber,
          slaTrackingId: record.id,
        },
      })

      await this.escalateIfConfigured(record, document)

      await emitter.emit('sla:breach', {
        tenantId: document.tenantId,
        documentId: document.id,
        slaTrackingId: record.id,
      })
    }

    return breachCount + reminderCount
  }

  /** Warn assignees before the earliest due timestamp (default 4h, overridable via escalation_rules). */
  async checkReminders(): Promise<number> {
    const now = DateTime.now()
    const candidates = await DocumentSlaTracking.query()
      .where('is_breached', false)
      .whereNull('reminder_sent_at')
      .preload('document')
      .preload('slaRule')

    let sent = 0

    for (const record of candidates) {
      const document = record.document
      if (!document) continue

      const rules = (record.slaRule?.escalationRules ?? {}) as EscalationRules
      const hoursBefore = Math.max(1, Number(rules.remindHoursBefore ?? 4))
      const earliestDue = this.earliestDue(record)
      if (!earliestDue) continue

      const remindAt = earliestDue.minus({ hours: hoursBefore })
      if (now < remindAt || now >= earliestDue) continue

      const recipientIds = await this.resolveSlaRecipients(document.tenantId, document)
      await notificationDispatcherService.dispatch({
        tenantId: document.tenantId,
        documentId: document.id,
        trigger: NotificationTrigger.SLA_REMINDER,
        recipientUserIds: recipientIds,
        title: `SLA reminder: ${document.title}`,
        body: `Document ${document.trackingNumber} is due within ${hoursBefore} hour(s).`,
        data: {
          documentId: document.id,
          trackingNumber: document.trackingNumber,
          dueAt: earliestDue.toISO(),
        },
      })

      record.reminderSentAt = now
      await record.save()
      sent += 1
    }

    return sent
  }

  private earliestDue(record: DocumentSlaTracking): DateTime | null {
    const dues = [record.reviewDueAt, record.approvalDueAt, record.completionDueAt].filter(
      (d): d is DateTime => Boolean(d)
    )
    if (!dues.length) return null
    return dues.reduce((a, b) => (a < b ? a : b))
  }

  private async escalateIfConfigured(record: DocumentSlaTracking, document: Document): Promise<void> {
    if (record.escalatedAt) return

    const rules = (record.slaRule?.escalationRules ?? {}) as EscalationRules
    const shouldEscalate = rules.escalateToAdmin !== false
    if (!shouldEscalate && !rules.escalateToRoleSlug) return

    const escalateRecipients = new Set<string>()
    const slug = rules.escalateToRoleSlug ?? DefaultRoleSlug.ADMIN
    const role = await Role.query().where('tenant_id', document.tenantId).where('slug', slug).first()
    if (role) {
      const ids = await notificationDispatcherService.resolveUserIdsByRole(document.tenantId, role.id)
      ids.forEach((id) => escalateRecipients.add(id))
    }

    if (escalateRecipients.size === 0) return

    await notificationDispatcherService.dispatch({
      tenantId: document.tenantId,
      documentId: document.id,
      trigger: NotificationTrigger.SLA_ESCALATION,
      recipientUserIds: [...escalateRecipients],
      title: `SLA escalation: ${document.title}`,
      body: `Document ${document.trackingNumber} breached SLA and was escalated to ${slug}.`,
      data: {
        documentId: document.id,
        trackingNumber: document.trackingNumber,
        escalatedTo: slug,
      },
    })

    record.escalatedAt = DateTime.now()
    await record.save()
  }

  private async resolveSlaRecipients(tenantId: string, document: Document): Promise<string[]> {
    const recipients = new Set<string>()

    if (document.assignedToId) {
      recipients.add(document.assignedToId)
    }

    if (document.createdById) {
      recipients.add(document.createdById)
    }

    const managerRole = await Role.query()
      .where('tenant_id', tenantId)
      .where('slug', DefaultRoleSlug.MANAGER)
      .first()

    if (managerRole) {
      const managers = await notificationDispatcherService.resolveUserIdsByRole(tenantId, managerRole.id)
      managers.forEach((id) => recipients.add(id))
    }

    if (recipients.size === 0) {
      const fallback = await User.query().where('tenant_id', tenantId).whereNull('deleted_at').limit(1).first()
      if (fallback) recipients.add(fallback.id)
    }

    return [...recipients]
  }
}

export const slaService = new SlaService()

export async function processSlaBreachCheck(): Promise<void> {
  await slaService.checkBreaches()
}

declare module '@adonisjs/core/types' {
  interface EventsList {
    'sla:breach': {
      tenantId: string
      documentId: string
      slaTrackingId: string
    }
  }
}
