import Notification from '#modules/library/models/notification'
import NotificationLog from '#modules/library/models/notification_log'
import NotificationPreference from '#modules/library/models/notification_preference'
import Member from '#modules/library/models/member'
import User from '#modules/library/models/user'
import { DateTime } from 'luxon'
import EmailChannel from '#modules/library/services/notifications/email_channel'
import SmsChannel from '#modules/library/services/notifications/sms_channel'
import {
  DEFAULT_EVENT_CHANNELS,
  SECURITY_EVENTS,
  type DispatchJobData,
  type NotificationChannel,
  type SendNotificationInput,
} from '#modules/library/services/notifications/notification_types'
import { tenantContext } from '#modules/library/services/tenant/tenant_context'

export default class NotificationService {
  private emailChannel = new EmailChannel()
  private smsChannel = new SmsChannel()

  async send(input: SendNotificationInput) {
    const channels = input.channels ?? DEFAULT_EVENT_CHANNELS[input.eventType] ?? ['in_app']
    const resolved = await this.resolveRecipientContact(input)

    const enabledChannels = input.force
      ? channels
      : await this.filterByPreferences(
          input.tenantId,
          input.recipientType,
          input.recipientId,
          input.eventType,
          channels
        )

    if (enabledChannels.includes('in_app')) {
      await this.deliverInApp(resolved)
      await NotificationLog.create({
        tenantId: resolved.tenantId,
        eventType: resolved.eventType,
        channel: 'in_app',
        recipientType: resolved.recipientType,
        recipientId: resolved.recipientId ?? null,
        title: resolved.title,
        body: resolved.body,
        payload: resolved.payload ?? {},
        status: 'sent',
        sentAt: DateTime.now(),
      })
    }

    for (const channel of enabledChannels) {
      if (channel === 'in_app') continue
      await this.deliverExternal(resolved, channel)
    }

    return { queued: false, channels: enabledChannels }
  }

  private async deliverExternal(input: SendNotificationInput, channel: 'email' | 'sms') {
    const log = await NotificationLog.create({
      tenantId: input.tenantId,
      eventType: input.eventType,
      channel,
      recipientType: input.recipientType,
      recipientId: input.recipientId ?? null,
      title: input.title,
      body: input.body,
      payload: input.payload ?? {},
      status: 'pending',
    })

    try {
      const result =
        channel === 'email' ? await this.emailChannel.send(input) : await this.smsChannel.send(input)
      if (!result.success) {
        log.status = 'failed'
        log.failedReason = result.error ?? `${channel} delivery failed`
      } else {
        log.status = 'sent'
        log.sentAt = DateTime.now()
        if (result.providerId) {
          log.payload = { ...(log.payload ?? {}), providerId: result.providerId }
        }
      }
    } catch (error) {
      log.status = 'failed'
      log.failedReason = error instanceof Error ? error.message : `${channel} delivery failed`
    }

    await log.save()
  }

  async dispatch(data: DispatchJobData) {
    for (const channel of data.channels) {
      const log = await NotificationLog.create({
        tenantId: data.tenantId,
        eventType: data.eventType,
        channel,
        recipientType: data.recipientType,
        recipientId: data.recipientId ?? null,
        title: data.title,
        body: data.body,
        payload: data.payload ?? {},
        status: 'pending',
      })

      try {
        if (channel === 'in_app') {
          await this.deliverInApp(data)
        } else if (channel === 'email') {
          const result = await this.emailChannel.send(data)
          if (!result.success) throw new Error(result.error ?? 'Email delivery failed')
        } else if (channel === 'sms') {
          const result = await this.smsChannel.send(data)
          if (!result.success) throw new Error(result.error ?? 'SMS delivery failed')
        }

        log.status = 'sent'
        log.sentAt = DateTime.now()
        await log.save()
      } catch (error) {
        log.status = 'failed'
        log.failedReason = error instanceof Error ? error.message : 'Unknown error'
        await log.save()
        throw error
      }
    }
  }

  async listForRecipient(recipientType: string, recipientId: string, page = 1, perPage = 20) {
    const tid = tenantContext.get().id
    return Notification.query()
      .where('tenant_id', tid)
      .where('recipient_type', recipientType)
      .where('recipient_id', recipientId)
      .orderBy('created_at', 'desc')
      .paginate(page, Math.min(perPage, 50))
  }

  async unreadCount(recipientType: string, recipientId: string) {
    const tid = tenantContext.get().id
    const result = await Notification.query()
      .where('tenant_id', tid)
      .where('recipient_type', recipientType)
      .where('recipient_id', recipientId)
      .whereNull('read_at')
      .count('* as total')
      .first()

    return Number(result?.$extras.total ?? 0)
  }

  async markRead(id: string, recipientType: string, recipientId: string) {
    const notification = await Notification.query()
      .where('id', id)
      .where('tenant_id', tenantContext.get().id)
      .where('recipient_type', recipientType)
      .where('recipient_id', recipientId)
      .firstOrFail()

    notification.readAt = DateTime.now()
    await notification.save()
    return notification
  }

  async markAllRead(recipientType: string, recipientId: string) {
    const tid = tenantContext.get().id
    const updated = await Notification.query()
      .where('tenant_id', tid)
      .where('recipient_type', recipientType)
      .where('recipient_id', recipientId)
      .whereNull('read_at')
      .update({ read_at: DateTime.now().toSQL() })

    return { updated: Number(updated[0] ?? 0) }
  }

  async getPreferences(ownerType: string, ownerId: string) {
    const tid = tenantContext.get().id
    return NotificationPreference.query()
      .where('tenant_id', tid)
      .where('owner_type', ownerType)
      .where('owner_id', ownerId)
  }

  async upsertPreference(
    ownerType: string,
    ownerId: string,
    eventType: string,
    prefs: { emailEnabled?: boolean; inAppEnabled?: boolean; smsEnabled?: boolean }
  ) {
    if (SECURITY_EVENTS.has(eventType)) {
      throw new Error('Cannot disable security notifications')
    }

    const tid = tenantContext.get().id
    let pref = await NotificationPreference.query()
      .where('tenant_id', tid)
      .where('owner_type', ownerType)
      .where('owner_id', ownerId)
      .where('event_type', eventType)
      .first()

    if (!pref) {
      pref = await NotificationPreference.create({
        tenantId: tid,
        ownerType,
        ownerId,
        eventType,
        emailEnabled: prefs.emailEnabled ?? true,
        inAppEnabled: prefs.inAppEnabled ?? true,
        smsEnabled: prefs.smsEnabled ?? false,
      })
    } else {
      if (prefs.emailEnabled !== undefined) pref.emailEnabled = prefs.emailEnabled
      if (prefs.inAppEnabled !== undefined) pref.inAppEnabled = prefs.inAppEnabled
      if (prefs.smsEnabled !== undefined) pref.smsEnabled = prefs.smsEnabled
      await pref.save()
    }

    return pref
  }

  async createPending(input: SendNotificationInput & { channel?: string }) {
    return NotificationLog.create({
      tenantId: input.tenantId,
      eventType: input.eventType,
      channel: input.channel ?? 'in_app',
      recipientType: input.recipientType,
      recipientId: input.recipientId ?? null,
      title: input.title,
      body: input.body,
      payload: input.payload ?? {},
      status: 'pending',
    })
  }

  async listDeliveryLog(page = 1, perPage = 20) {
    const tid = tenantContext.get().id
    return NotificationLog.query()
      .where('tenant_id', tid)
      .orderBy('created_at', 'desc')
      .paginate(page, Math.min(perPage, 50))
  }

  async markSent(notificationId: string) {
    const log = await NotificationLog.findOrFail(notificationId)
    log.status = 'sent'
    log.sentAt = DateTime.now()
    await log.save()
    return log
  }

  async markFailed(notificationId: string, reason?: string) {
    const log = await NotificationLog.findOrFail(notificationId)
    log.status = 'failed'
    log.failedReason = reason ?? null
    await log.save()
    return log
  }

  private async deliverInApp(data: SendNotificationInput) {
    if (!data.recipientId) return

    await Notification.create({
      tenantId: data.tenantId,
      eventType: data.eventType,
      recipientType: data.recipientType,
      recipientId: data.recipientId,
      title: data.title,
      body: data.body,
      payload: data.payload ?? {},
    })
  }

  private async resolveRecipientContact(input: SendNotificationInput): Promise<SendNotificationInput> {
    let email = input.email ?? null
    let phone = input.phone ?? null
    let recipientName = input.recipientName ?? null
    const needsContact = input.email === undefined || input.phone === undefined

    if (input.recipientId && (needsContact || !recipientName)) {
      if (input.recipientType === 'member') {
        const member = await Member.find(input.recipientId)
        if (needsContact) {
          email = email ?? member?.email ?? null
          phone = phone ?? member?.contact ?? null
        }
        recipientName = recipientName ?? member?.fullName ?? null
      } else if (input.recipientType === 'user') {
        const user = await User.find(input.recipientId)
        if (needsContact) email = email ?? user?.email ?? null
        recipientName = recipientName ?? user?.fullName ?? null
      }
    }

    return { ...input, email, phone, recipientName }
  }

  private async filterByPreferences(
    tenantId: string,
    recipientType: string,
    recipientId: string | undefined,
    eventType: string,
    channels: NotificationChannel[]
  ): Promise<NotificationChannel[]> {
    if (!recipientId || recipientType === 'staff') return channels

    const pref = await NotificationPreference.query()
      .where('tenant_id', tenantId)
      .where('owner_type', recipientType)
      .where('owner_id', recipientId)
      .where('event_type', eventType)
      .first()

    if (!pref) return channels

    return channels.filter((channel) => {
      if (channel === 'email') return pref.emailEnabled
      if (channel === 'in_app') return pref.inAppEnabled
      if (channel === 'sms') return pref.smsEnabled
      return true
    })
  }
}
