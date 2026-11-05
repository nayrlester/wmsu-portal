import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import Borrowing from '#modules/library/models/borrowing'
import Member from '#modules/library/models/member'
import Reservation from '#modules/library/models/reservation'
import Book from '#modules/library/models/book'
import NotificationService from '#modules/library/services/notifications/notification_service'
import { NOTIFICATION_EVENTS } from '#modules/library/services/notifications/notification_types'

export default class ScheduledNotificationsService {
  constructor(private notificationService = new NotificationService()) {}

  async sendDueDateReminders(tenantId?: string) {
    const now = DateTime.now().startOf('day')
    const reminderDays = [1, 3]
    let sent = 0

    for (const daysAhead of reminderDays) {
      const targetDate = now.plus({ days: daysAhead })
      const start = targetDate.toSQL()!
      const end = targetDate.endOf('day').toSQL()!

      const query = Borrowing.query()
        .where('status', 'borrowed')
        .whereNotNull('due_at')
        .whereBetween('due_at', [start, end])
        .preload('member')
        .preload('book')

      if (tenantId) query.where('tenant_id', tenantId)

      const borrowings = await query

      for (const borrowing of borrowings) {
        const idempotencyKey = `${borrowing.id}:d-${daysAhead}`
        if (await this.wasNotificationSent(borrowing.tenantId, NOTIFICATION_EVENTS.DUE_DATE_REMINDER, idempotencyKey)) {
          continue
        }

        await this.notificationService.send({
          tenantId: borrowing.tenantId,
          eventType: NOTIFICATION_EVENTS.DUE_DATE_REMINDER,
          recipientType: 'member',
          recipientId: borrowing.memberId,
          title: `Due in ${daysAhead} day${daysAhead > 1 ? 's' : ''}`,
          body: `"${borrowing.book.title}" is due on ${borrowing.dueAt!.toFormat('MMM d, yyyy')}.`,
          payload: {
            borrowingId: borrowing.id,
            dueAt: borrowing.dueAt?.toISO(),
            reminderDays: daysAhead,
            idempotencyKey,
          },
        })

        sent++
      }
    }

    return { sent }
  }

  async sendMembershipExpiryNotices(tenantId?: string) {
    const now = DateTime.now().startOf('day')
    const windows = [
      { days: 30, label: '30 days' },
      { days: 7, label: '7 days' },
      { days: 1, label: 'tomorrow' },
    ]
    let sent = 0

    for (const window of windows) {
      const target = now.plus({ days: window.days })
      const query = Member.query()
        .where('membership_status', 'approved')
        .whereNull('deleted_at')
        .whereNotNull('membership_expires_at')
        .whereBetween('membership_expires_at', [target.toSQL()!, target.endOf('day').toSQL()!])

      if (tenantId) query.where('tenant_id', tenantId)

      const members = await query

      for (const member of members) {
        const idempotencyKey = `${member.id}:exp-${window.days}`
        if (await this.wasNotificationSent(member.tenantId, NOTIFICATION_EVENTS.MEMBERSHIP_EXPIRING, idempotencyKey)) {
          continue
        }

        await this.notificationService.send({
          tenantId: member.tenantId,
          eventType: NOTIFICATION_EVENTS.MEMBERSHIP_EXPIRING,
          recipientType: 'member',
          recipientId: member.id,
          title: 'Membership expiring soon',
          body: `Your library membership expires in ${window.label} (${member.membershipExpiresAt!.toFormat('MMM d, yyyy')}).`,
          payload: {
            memberId: member.id,
            expiresAt: member.membershipExpiresAt?.toISO(),
            daysRemaining: window.days,
            idempotencyKey,
          },
        })

        sent++
      }
    }

    const expiredQuery = Member.query()
      .where('membership_status', 'approved')
      .whereNull('deleted_at')
      .whereNotNull('membership_expires_at')
      .where('membership_expires_at', '<', now.toSQL()!)

    if (tenantId) expiredQuery.where('tenant_id', tenantId)

    const expiredMembers = await expiredQuery
    let expired = 0

    for (const member of expiredMembers) {
      member.membershipStatus = 'expired'
      await member.save()

      await this.notificationService.send({
        tenantId: member.tenantId,
        eventType: NOTIFICATION_EVENTS.MEMBERSHIP_EXPIRED,
        recipientType: 'member',
        recipientId: member.id,
        title: 'Membership expired',
        body: 'Your library membership has expired. Contact the library to renew.',
        payload: { memberId: member.id, idempotencyKey: `${member.id}:expired` },
        force: true,
      })

      expired++
    }

    return { sent, expired }
  }

  async sendReservationNotifications(tenantId?: string) {
    const readyQuery = Reservation.query()
      .where('status', 'ready')
      .whereNotNull('ready_at')

    if (tenantId) readyQuery.where('tenant_id', tenantId)

    const reservations = await readyQuery
    let sent = 0

    for (const reservation of reservations) {
      const idempotencyKey = `${reservation.id}:ready`
      if (await this.wasNotificationSent(reservation.tenantId, NOTIFICATION_EVENTS.RESERVATION_READY, idempotencyKey)) {
        continue
      }

      const book = await Book.find(reservation.bookId)

      await this.notificationService.send({
        tenantId: reservation.tenantId,
        eventType: NOTIFICATION_EVENTS.RESERVATION_READY,
        recipientType: 'member',
        recipientId: reservation.memberId,
        title: 'Reservation ready',
        body: `"${book?.title ?? 'Your reserved book'}" is ready for pickup.`,
        payload: { reservationId: reservation.id, bookId: reservation.bookId, idempotencyKey },
      })

      sent++
    }

    const now = DateTime.now()
    const expiredQuery = Reservation.query()
      .whereIn('status', ['pending', 'ready'])
      .whereNotNull('expires_at')
      .where('expires_at', '<', now.toSQL()!)

    if (tenantId) expiredQuery.where('tenant_id', tenantId)

    const expiredReservations = await expiredQuery
    let expired = 0

    for (const reservation of expiredReservations) {
      reservation.status = 'expired'
      await reservation.save()

      const book = await Book.find(reservation.bookId)

      await this.notificationService.send({
        tenantId: reservation.tenantId,
        eventType: NOTIFICATION_EVENTS.RESERVATION_EXPIRED,
        recipientType: 'member',
        recipientId: reservation.memberId,
        title: 'Reservation expired',
        body: `Your reservation for "${book?.title ?? 'a book'}" has expired.`,
        payload: { reservationId: reservation.id, idempotencyKey: `${reservation.id}:expired` },
      })

      expired++
    }

    return { sent, expired }
  }

  private async wasNotificationSent(
    tenantId: string,
    eventType: string,
    idempotencyKey: string
  ): Promise<boolean> {
    const result = await db.rawQuery(
      `
      SELECT 1 FROM notification_logs
      WHERE tenant_id = ?
        AND event_type = ?
        AND status = 'sent'
        AND payload->>'idempotencyKey' = ?
      LIMIT 1
      `,
      [tenantId, eventType, idempotencyKey]
    )

    return (result.rows as unknown[]).length > 0
  }
}
