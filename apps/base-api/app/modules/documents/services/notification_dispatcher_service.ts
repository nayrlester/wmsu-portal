import app from '@adonisjs/core/services/app'
import env from '#start/env'
import { NotificationChannel } from '#modules/documents/domain/enums/index'
import {
  DEFAULT_NOTIFICATION_CHANNELS,
  type NotificationDispatchInput,
  type NotificationJobPayload,
} from '#modules/documents/domain/notifications/notification_types'
import { notificationRepository } from '#infrastructure/repositories/notification_repository'
import { getNotificationQueue } from '#infrastructure/queue/queues'
import { processNotificationDelivery } from '#jobs/notification_delivery_job'
import { socketService } from '#infrastructure/realtime/socket_service'
import User from '#modules/documents/models/user'
import TenantSetting from '#modules/documents/models/tenant_setting'

export class NotificationDispatcherService {
  async dispatch(input: NotificationDispatchInput): Promise<void> {
    const channels = input.channels ?? DEFAULT_NOTIFICATION_CHANNELS
    const enabledChannels = await this.filterChannelsByTenantPreferences(input.tenantId, channels)

    for (const userId of input.recipientUserIds) {
      for (const channel of enabledChannels) {
        if (channel === NotificationChannel.IN_APP) {
          const notification = await notificationRepository.createInApp({
            tenantId: input.tenantId,
            userId,
            type: input.trigger,
            title: input.title,
            body: input.body,
            data: input.data ?? null,
          })

          socketService.emitToUser(input.tenantId, userId, 'notification:new', {
            id: notification.id,
            type: input.trigger,
            title: input.title,
            body: input.body,
            data: input.data ?? null,
            createdAt: notification.createdAt.toISO(),
          })
          continue
        }

        const jobPayload: NotificationJobPayload = {
          tenantId: input.tenantId,
          userId,
          channel,
          type: input.trigger,
          title: input.title,
          body: input.body,
          data: input.data ?? null,
        }

        if (this.shouldProcessSynchronously()) {
          await processNotificationDelivery(jobPayload)
        } else {
          await getNotificationQueue().add(`${channel}-${userId}-${input.trigger}`, jobPayload, {
            jobId: `${input.documentId}-${userId}-${channel}-${input.trigger}-${Date.now()}`,
          })
        }
      }
    }
  }

  async resolveUserIdsByRole(tenantId: string, roleId: string): Promise<string[]> {
    const users = await User.query()
      .where('tenant_id', tenantId)
      .whereNull('deleted_at')
      .whereHas('roles', (query) => {
        query.where('roles.id', roleId)
      })

    return users.map((user) => user.id)
  }

  private shouldProcessSynchronously(): boolean {
    return app.inTest || env.get('QUEUE_SYNC') === true
  }

  private async filterChannelsByTenantPreferences(
    tenantId: string,
    channels: NotificationChannel[]
  ): Promise<NotificationChannel[]> {
    const settings = await TenantSetting.query().where('tenant_id', tenantId).first()
    const prefs = settings?.notificationPreferences as Record<string, boolean> | null

    if (!prefs) return channels

    return channels.filter((channel) => {
      const key = channel === NotificationChannel.IN_APP ? 'inApp' : channel
      return prefs[key] !== false
    })
  }
}

export const notificationDispatcherService = new NotificationDispatcherService()
