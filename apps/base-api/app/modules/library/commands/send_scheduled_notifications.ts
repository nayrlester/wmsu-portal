import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import ScheduledNotificationsService from '#modules/library/services/notifications/scheduled_notifications_service'

export default class SendScheduledNotifications extends BaseCommand {
  static commandName = 'notifications:send-scheduled'
  static description = 'Send due-date reminders, membership expiry notices, and reservation alerts'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    const service = new ScheduledNotificationsService()
    const [dueReminders, membership, reservations] = await Promise.all([
      service.sendDueDateReminders(),
      service.sendMembershipExpiryNotices(),
      service.sendReservationNotifications(),
    ])

    this.logger.success(
      `Due reminders: ${dueReminders.sent}, membership: ${membership.sent} sent / ${membership.expired} expired, reservations: ${reservations.sent} sent / ${reservations.expired} expired`
    )
  }
}
