import type { HttpContext } from '@adonisjs/core/http'
import NotificationService from '#modules/library/services/notifications/notification_service'
import ForbiddenException from '#modules/library/exceptions/forbidden_exception'
import {
  listNotificationsValidator,
  updateNotificationPreferenceValidator,
} from '#modules/library/validators/notification'

export default class NotificationsController {
  private notificationService = new NotificationService()

  async deliveryLog(ctx: HttpContext) {
    if (!ctx.authUser || !ctx.authUser.permissions.includes('reports:export')) {
      throw new ForbiddenException('Missing permission: reports:export')
    }

    const filters = await ctx.request.validateUsing(listNotificationsValidator)
    const paginator = await this.notificationService.listDeliveryLog(filters.page ?? 1, filters.perPage ?? 20)

    return ctx.response.ok({
      success: true,
      data: paginator.all().map((log) => ({
        id: log.id,
        eventType: log.eventType,
        channel: log.channel,
        title: log.title,
        status: log.status,
        failedReason: log.failedReason,
        sentAt: log.sentAt?.toISO() ?? null,
        createdAt: log.createdAt.toISO(),
      })),
      meta: paginator.getMeta(),
    })
  }

  async index(ctx: HttpContext) {
    if (!ctx.authUser) throw new ForbiddenException('Authentication required')

    const filters = await ctx.request.validateUsing(listNotificationsValidator)
    const paginator = await this.notificationService.listForRecipient(
      'user',
      ctx.authUser.id,
      filters.page,
      filters.perPage
    )

    return ctx.response.ok({
      success: true,
      data: paginator.all().map((n) => this.serialize(n)),
      meta: paginator.getMeta(),
    })
  }

  async unreadCount(ctx: HttpContext) {
    if (!ctx.authUser) throw new ForbiddenException('Authentication required')

    const count = await this.notificationService.unreadCount('user', ctx.authUser.id)

    return ctx.response.ok({ success: true, data: { count } })
  }

  async markRead(ctx: HttpContext) {
    if (!ctx.authUser) throw new ForbiddenException('Authentication required')

    const notification = await this.notificationService.markRead(
      ctx.params.id,
      'user',
      ctx.authUser.id
    )

    return ctx.response.ok({ success: true, data: this.serialize(notification) })
  }

  async markAllRead(ctx: HttpContext) {
    if (!ctx.authUser) throw new ForbiddenException('Authentication required')

    const result = await this.notificationService.markAllRead('user', ctx.authUser.id)

    return ctx.response.ok({ success: true, data: result })
  }

  async preferences(ctx: HttpContext) {
    if (!ctx.authUser) throw new ForbiddenException('Authentication required')

    const prefs = await this.notificationService.getPreferences('user', ctx.authUser.id)

    return ctx.response.ok({
      success: true,
      data: prefs.map((p) => ({
        eventType: p.eventType,
        emailEnabled: p.emailEnabled,
        inAppEnabled: p.inAppEnabled,
        smsEnabled: p.smsEnabled,
      })),
    })
  }

  async updatePreference(ctx: HttpContext) {
    if (!ctx.authUser) throw new ForbiddenException('Authentication required')

    const payload = await ctx.request.validateUsing(updateNotificationPreferenceValidator)

    try {
      const pref = await this.notificationService.upsertPreference(
        'user',
        ctx.authUser.id,
        payload.eventType,
        {
          emailEnabled: payload.emailEnabled,
          inAppEnabled: payload.inAppEnabled,
          smsEnabled: payload.smsEnabled,
        }
      )

      return ctx.response.ok({
        success: true,
        data: {
          eventType: pref.eventType,
          emailEnabled: pref.emailEnabled,
          inAppEnabled: pref.inAppEnabled,
          smsEnabled: pref.smsEnabled,
        },
      })
    } catch (error) {
      return ctx.response.badRequest({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update preference',
      })
    }
  }

  private serialize(notification: {
    id: string
    eventType: string
    title: string
    body: string
    payload: Record<string, unknown>
    readAt: { toISO: () => string | null } | null
    createdAt: { toISO: () => string | null }
  }) {
    return {
      id: notification.id,
      eventType: notification.eventType,
      title: notification.title,
      body: notification.body,
      payload: notification.payload,
      readAt: notification.readAt?.toISO() ?? null,
      createdAt: notification.createdAt.toISO(),
    }
  }
}
