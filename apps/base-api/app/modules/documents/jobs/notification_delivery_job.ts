import { NotificationChannel } from '#modules/documents/domain/enums/index'
import type { NotificationJobPayload } from '#modules/documents/domain/notifications/notification_types'
import { mailService } from '#modules/documents/services/mail_service'
import { pushNotificationService } from '#modules/documents/services/push_notification_service'
import { notificationRepository } from '#modules/documents/infrastructure/repositories/notification_repository'
import User from '#modules/documents/models/user'

export async function processNotificationDelivery(payload: NotificationJobPayload): Promise<void> {
  if (payload.channel === NotificationChannel.EMAIL) {
    const user = await User.find(payload.userId)
    if (!user?.email) return

    await mailService.send({
      to: user.email,
      subject: payload.title,
      html: `<p>${payload.body ?? payload.title}</p>`,
      text: payload.body ?? payload.title,
    })

    if (payload.notificationId) {
      await notificationRepository.markSent(payload.notificationId)
    }
    return
  }

  if (payload.channel === NotificationChannel.PUSH) {
    await pushNotificationService.sendToUser(
      payload.userId,
      {
        title: payload.title,
        body: payload.body,
        data: Object.fromEntries(
          Object.entries(payload.data ?? {}).map(([key, value]) => [key, String(value)])
        ),
      },
      payload.tenantId
    )
  }
}
