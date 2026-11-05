import { DateTime } from 'luxon'
import Notification from '#modules/documents/models/notification'
import { tenantContext } from '#modules/documents/domain/tenant_context'
import { NotificationChannel } from '#modules/documents/domain/enums/index'

export class NotificationRepository {
  async createInApp(data: {
    tenantId: string
    userId: string
    type: string
    title: string
    body: string | null
    data: Record<string, unknown> | null
  }): Promise<Notification> {
    return Notification.create({
      tenantId: data.tenantId,
      userId: data.userId,
      type: data.type,
      title: data.title,
      body: data.body,
      data: data.data,
      channel: NotificationChannel.IN_APP,
      isRead: false,
      sentAt: DateTime.now(),
    })
  }

  async markSent(notificationId: string): Promise<void> {
    await Notification.query().where('id', notificationId).update({ sentAt: DateTime.now() })
  }

  async listForUser(userId: string, page = 1, limit = 20) {
    const tenantId = tenantContext.requireTenantId()
    return Notification.query()
      .where('tenant_id', tenantId)
      .where('user_id', userId)
      .where('channel', NotificationChannel.IN_APP)
      .whereNull('deleted_at')
      .orderBy('created_at', 'desc')
      .paginate(page, Math.min(limit, 100))
  }

  async unreadCount(userId: string): Promise<number> {
    const tenantId = tenantContext.requireTenantId()
    const result = await Notification.query()
      .where('tenant_id', tenantId)
      .where('user_id', userId)
      .where('channel', NotificationChannel.IN_APP)
      .where('is_read', false)
      .whereNull('deleted_at')
      .count('* as total')

    return Number(result[0]?.$extras.total ?? 0)
  }

  async markRead(userId: string, notificationId: string): Promise<Notification | null> {
    const tenantId = tenantContext.requireTenantId()
    const notification = await Notification.query()
      .where('id', notificationId)
      .where('tenant_id', tenantId)
      .where('user_id', userId)
      .whereNull('deleted_at')
      .first()

    if (!notification) return null

    notification.isRead = true
    notification.readAt = DateTime.now()
    await notification.save()
    return notification
  }

  async markAllRead(userId: string): Promise<void> {
    const tenantId = tenantContext.requireTenantId()
    await Notification.query()
      .where('tenant_id', tenantId)
      .where('user_id', userId)
      .where('channel', NotificationChannel.IN_APP)
      .where('is_read', false)
      .whereNull('deleted_at')
      .update({ is_read: true, read_at: DateTime.now() })
  }
}

export const notificationRepository = new NotificationRepository()
