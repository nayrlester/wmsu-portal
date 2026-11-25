import { DateTime } from 'luxon'
import Document from '#modules/documents/models/document'
import Role from '#modules/documents/models/role'
import { NotificationTrigger } from '#modules/documents/domain/notifications/notification_types'
import { notificationDispatcherService } from '#modules/documents/services/notification_dispatcher_service'
import { DefaultRoleSlug } from '#modules/documents/domain/enums/index'
import { suggestLifecycleForDueDocuments } from '#modules/documents/services/retention_schedule_service'

const ALERT_WINDOW_DAYS = 30

export async function processRetentionDueAlerts(): Promise<{
  alerts: number
  lifecycleUpdates: number
}> {
  const lifecycleUpdates = await suggestLifecycleForDueDocuments()

  const now = DateTime.now()
  const until = now.plus({ days: ALERT_WINDOW_DAYS })

  const documents = await Document.query()
    .whereNull('deleted_at')
    .whereNotNull('retention_due_at')
    .where('retention_due_at', '<=', until.toSQL()!)
    .where('retention_due_at', '>=', now.minus({ days: 1 }).toSQL()!)
    .limit(200)

  let alerts = 0
  const byTenant = new Map<string, Document[]>()
  for (const doc of documents) {
    const list = byTenant.get(doc.tenantId) ?? []
    list.push(doc)
    byTenant.set(doc.tenantId, list)
  }

  for (const [tenantId, docs] of byTenant) {
    const roles = await Role.query()
      .where('tenant_id', tenantId)
      .whereIn('slug', [DefaultRoleSlug.TENANT_OWNER, DefaultRoleSlug.ADMIN, DefaultRoleSlug.MANAGER])

    const recipientIds = new Set<string>()
    for (const role of roles) {
      const ids = await notificationDispatcherService.resolveUserIdsByRole(tenantId, role.id)
      ids.forEach((id) => recipientIds.add(id))
    }

    if (!recipientIds.size) continue

    for (const document of docs) {
      const dueLabel = document.retentionDueAt?.toISODate() ?? 'soon'
      await notificationDispatcherService.dispatch({
        tenantId,
        documentId: document.id,
        trigger: NotificationTrigger.RETENTION_DUE,
        recipientUserIds: [...recipientIds],
        title: `Retention due: ${document.trackingNumber}`,
        body: `Record "${document.title}" reaches retention on ${dueLabel}.`,
        data: {
          retentionDueAt: document.retentionDueAt?.toISO() ?? null,
          lifecycleStatus: document.lifecycleStatus,
          dispositionAction: document.dispositionAction,
        },
      })
      alerts += 1
    }
  }

  return { alerts, lifecycleUpdates }
}
