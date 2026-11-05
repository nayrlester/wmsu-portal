import { Queue, Worker, type JobsOptions } from 'bullmq'
import logger from '@adonisjs/core/services/logger'
import redisConfig from '#config/redis'
import NotificationService from '#modules/library/services/notifications/notification_service'
import { closeSearchIndexQueue, startSearchIndexWorker } from '#modules/library/services/queue/search_index_queue'
import type {
  DispatchJobData,
  SendNotificationInput,
} from '#modules/library/services/notifications/notification_types'

const connection = {
  host: redisConfig.host,
  port: redisConfig.port,
  password: redisConfig.password,
}

export const QUEUE_NAMES = {
  notifications: 'librastack-notifications',
  overdue: 'librastack-overdue',
  scheduled: 'librastack-scheduled',
  reports: 'librastack-scheduled-reports',
} as const

/** @deprecated Use SendNotificationInput via NotificationService.send */
export type NotificationJobData = SendNotificationInput

let notificationQueue: Queue<DispatchJobData> | null = null
let overdueQueue: Queue | null = null
let scheduledQueue: Queue | null = null
let reportsQueue: Queue | null = null

export function getNotificationQueue() {
  if (!notificationQueue) {
    notificationQueue = new Queue<DispatchJobData>(QUEUE_NAMES.notifications, { connection })
  }
  return notificationQueue
}

export function getOverdueQueue() {
  if (!overdueQueue) {
    overdueQueue = new Queue(QUEUE_NAMES.overdue, { connection })
  }
  return overdueQueue
}

export function getScheduledQueue() {
  if (!scheduledQueue) {
    scheduledQueue = new Queue(QUEUE_NAMES.scheduled, { connection })
  }
  return scheduledQueue
}

export function getReportsQueue() {
  if (!reportsQueue) {
    reportsQueue = new Queue(QUEUE_NAMES.reports, { connection })
  }
  return reportsQueue
}

export async function enqueueNotification(data: SendNotificationInput) {
  const notificationService = new NotificationService()
  await notificationService.send(data)
}

export async function enqueueDispatch(data: DispatchJobData, opts?: JobsOptions) {
  const queue = getNotificationQueue()
  await queue.add('dispatch-notification', data, {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    ...opts,
  })
}

export async function scheduleOverdueChecker() {
  const queue = getOverdueQueue()
  await queue.add(
    'check-overdue',
    {},
    {
      repeat: { pattern: '0 * * * *' },
      removeOnComplete: 10,
      removeOnFail: 10,
      jobId: 'overdue-checker-hourly',
    }
  )
}

export async function scheduleNotificationJobs() {
  const queue = getScheduledQueue()
  await queue.add(
    'scheduled-notifications',
    {},
    {
      repeat: { pattern: '0 8 * * *' },
      removeOnComplete: 10,
      removeOnFail: 10,
      jobId: 'scheduled-notifications-daily',
    }
  )
}

export async function scheduleReportJobs() {
  const queue = getReportsQueue()
  await queue.add(
    'scheduled-reports',
    {},
    {
      // Daily at 07:00; per-tenant cron/dow filters inside ScheduledReportsService
      repeat: { pattern: '0 7 * * *' },
      removeOnComplete: 10,
      removeOnFail: 10,
      jobId: 'scheduled-reports-daily',
    }
  )
}

export function startWorkers() {
  const notificationService = new NotificationService()
  const searchIndexWorker = startSearchIndexWorker()

  const notificationWorker = new Worker<DispatchJobData>(
    QUEUE_NAMES.notifications,
    async (job) => {
      await notificationService.dispatch(job.data)
      return { dispatched: true, channels: job.data.channels }
    },
    { connection }
  )

  const overdueWorker = new Worker(
    QUEUE_NAMES.overdue,
    async () => {
      const { default: BorrowingService } = await import('#modules/library/services/borrowing/borrowing_service')
      const borrowingService = new BorrowingService()
      return borrowingService.processOverdueBorrowings()
    },
    { connection }
  )

  const scheduledWorker = new Worker(
    QUEUE_NAMES.scheduled,
    async () => {
      const { default: ScheduledNotificationsService } = await import(
        '#modules/library/services/notifications/scheduled_notifications_service'
      )
      const service = new ScheduledNotificationsService()
      const [dueReminders, membership, reservations] = await Promise.all([
        service.sendDueDateReminders(),
        service.sendMembershipExpiryNotices(),
        service.sendReservationNotifications(),
      ])
      return { dueReminders, membership, reservations }
    },
    { connection }
  )

  const reportsWorker = new Worker(
    QUEUE_NAMES.reports,
    async () => {
      const { default: ScheduledReportsService } = await import(
        '#modules/library/services/reports/scheduled_reports_service'
      )
      const service = new ScheduledReportsService()
      return service.runScheduledReports()
    },
    { connection }
  )

  const onFailed = (name: string) => (job: { id?: string } | undefined, err: Error) => {
    logger.error({ jobId: job?.id, queue: name, err: err.message }, 'Queue job failed')
  }

  notificationWorker.on('failed', onFailed('notifications'))
  overdueWorker.on('failed', onFailed('overdue'))
  scheduledWorker.on('failed', onFailed('scheduled'))
  reportsWorker.on('failed', onFailed('reports'))
  searchIndexWorker.on('failed', onFailed('search-index'))

  return {
    notificationWorker,
    overdueWorker,
    scheduledWorker,
    reportsWorker,
    searchIndexWorker,
  }
}

export async function closeQueues() {
  await notificationQueue?.close()
  await overdueQueue?.close()
  await scheduledQueue?.close()
  await reportsQueue?.close()
  await closeSearchIndexQueue()
  notificationQueue = null
  overdueQueue = null
  scheduledQueue = null
  reportsQueue = null
}
