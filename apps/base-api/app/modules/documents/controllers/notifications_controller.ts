import type { HttpContext } from '@adonisjs/core/http'
import { notificationRepository } from '#infrastructure/repositories/notification_repository'
import { listNotificationsValidator } from '#modules/documents/validators/notification'

export default class NotificationsController {
  async index({ request, auth, response }: HttpContext) {
    const { page, limit } = await request.validateUsing(listNotificationsValidator, {
      data: request.qs(),
    })

    const notifications = await notificationRepository.listForUser(auth.user!.id, page, limit)

    return response.ok({
      meta: notifications.getMeta(),
      notifications: notifications.all().map((notification) => ({
        id: notification.id,
        type: notification.type,
        title: notification.title,
        body: notification.body,
        data: notification.data,
        isRead: notification.isRead,
        readAt: notification.readAt,
        createdAt: notification.createdAt,
      })),
    })
  }

  async unreadCount({ auth, response }: HttpContext) {
    const count = await notificationRepository.unreadCount(auth.user!.id)
    return response.ok({ unreadCount: count })
  }

  async markRead({ params, auth, response }: HttpContext) {
    const notification = await notificationRepository.markRead(auth.user!.id, params.id)
    if (!notification) {
      return response.notFound({ error: 'Notification not found' })
    }

    return response.ok({
      id: notification.id,
      isRead: notification.isRead,
      readAt: notification.readAt,
    })
  }

  async markAllRead({ auth, response }: HttpContext) {
    await notificationRepository.markAllRead(auth.user!.id)
    return response.ok({ message: 'All notifications marked as read' })
  }
}
