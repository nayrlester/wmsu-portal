import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import {
  closeQueues,
  scheduleNotificationJobs,
  scheduleOverdueChecker,
  scheduleReportJobs,
  startWorkers,
} from '#modules/library/services/queue/queue_service'

export default class QueueListen extends BaseCommand {
  static commandName = 'queue:listen'
  static description = 'Start BullMQ workers for notifications, overdue checks, and scheduled jobs'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    this.logger.info('Starting BullMQ workers...')

    await scheduleOverdueChecker()
    await scheduleNotificationJobs()
    await scheduleReportJobs()
    const {
      notificationWorker,
      overdueWorker,
      scheduledWorker,
      reportsWorker,
      searchIndexWorker,
    } = startWorkers()

    this.logger.success('Workers running. Press Ctrl+C to stop.')

    const shutdown = async () => {
      this.logger.info('Shutting down workers...')
      await notificationWorker.close()
      await overdueWorker.close()
      await scheduledWorker.close()
      await reportsWorker.close()
      await searchIndexWorker.close()
      await closeQueues()
      process.exit(0)
    }

    process.on('SIGINT', shutdown)
    process.on('SIGTERM', shutdown)

    await new Promise(() => {})
  }
}
