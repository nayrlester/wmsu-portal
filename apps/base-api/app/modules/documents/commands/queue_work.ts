import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import type { Job, Worker } from 'bullmq'
import {
  createNotificationWorker,
  createSlaWorker,
  createIntelligenceWorker,
  createFileProcessingWorker,
  createRetentionWorker,
  getSlaQueue,
  getRetentionQueue,
} from '#infrastructure/queue/queues'
import { processNotificationDelivery } from '#jobs/notification_delivery_job'
import { processDocumentIntelligence } from '#jobs/document_intelligence_job'
import { processFileProcessing } from '#jobs/file_processing_job'
import { processRetentionDueAlerts } from '#jobs/retention_alert_job'
import { processSlaBreachCheck } from '#modules/documents/services/sla_service'
import { closeQueueConnections, getBullMqConnection } from '#infrastructure/queue/redis_connection'

const SLA_CHECK_INTERVAL_MS = 5 * 60 * 1000
const SLA_REPEAT_JOB_ID = 'sla-breach-check'
const RETENTION_CHECK_INTERVAL_MS = 60 * 60 * 1000
const RETENTION_REPEAT_JOB_ID = 'retention-due-check'

function formatWorkerError(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return 'Unknown worker error'
}

function attachWorkerLogging(
  worker: Worker,
  label: string,
  logError: (message: string) => void
): void {
  worker.on('error', (error) => logError(`${label}: ${formatWorkerError(error)}`))
  worker.on('failed', (job: Job | undefined, error) => {
    logError(`${label} job failed (id=${job?.id ?? 'unknown'}): ${formatWorkerError(error)}`)
  })
}

export default class QueueWork extends BaseCommand {
  static commandName = 'queue:work'
  static description =
    'Process BullMQ notification, SLA, and intelligence jobs (horizontally scalable workers)'

  static options: CommandOptions = {
    startApp: true,
    staysAlive: true,
  }

  async run() {
    this.logger.info('Starting queue workers...')

    try {
      const pong = await getBullMqConnection().ping()
      if (pong !== 'PONG') {
        throw new Error(`Unexpected Redis response: ${pong}`)
      }
    } catch (error) {
      this.logger.error(
        `Redis is not reachable. Start it with "npm run docker:up" (or docker compose up -d redis). ${formatWorkerError(error)}`
      )
      this.exitCode = 1
      return
    }

    const logError = (message: string) => this.logger.error(message)

    const notificationWorker = createNotificationWorker(processNotificationDelivery)
    const slaWorker = createSlaWorker(processSlaBreachCheck)
    const intelligenceWorker = createIntelligenceWorker(processDocumentIntelligence)
    const fileProcessingWorker = createFileProcessingWorker(processFileProcessing)
    const retentionWorker = createRetentionWorker(async () => {
      await processRetentionDueAlerts()
    })

    attachWorkerLogging(notificationWorker, 'Notification worker', logError)
    attachWorkerLogging(slaWorker, 'SLA worker', logError)
    attachWorkerLogging(intelligenceWorker, 'Intelligence worker', logError)
    attachWorkerLogging(fileProcessingWorker, 'File processing worker', logError)
    attachWorkerLogging(retentionWorker, 'Retention worker', logError)

    const workers = [
      notificationWorker,
      slaWorker,
      intelligenceWorker,
      fileProcessingWorker,
      retentionWorker,
    ]

    try {
      await getSlaQueue().add(
        'check-breaches',
        {},
        {
          repeat: { every: SLA_CHECK_INTERVAL_MS },
          jobId: SLA_REPEAT_JOB_ID,
        }
      )
      await getRetentionQueue().add(
        'check-retention',
        {},
        {
          repeat: { every: RETENTION_CHECK_INTERVAL_MS },
          jobId: RETENTION_REPEAT_JOB_ID,
        }
      )
    } catch (error) {
      this.logger.error(`Could not schedule repeat jobs: ${formatWorkerError(error)}`)
      this.exitCode = 1
      await Promise.all(workers.map((worker) => worker.close()))
      await closeQueueConnections()
      return
    }

    this.logger.info(
      'Workers listening (notifications, SLA, intelligence, file processing, retention). Press Ctrl+C to stop.'
    )

    let shuttingDown = false
    const shutdown = async () => {
      if (shuttingDown) return
      shuttingDown = true
      await Promise.all(workers.map((worker) => worker.close()))
      await closeQueueConnections()
      this.terminate()
    }

    process.once('SIGINT', shutdown)
    process.once('SIGTERM', shutdown)
  }
}
