import { Queue, Worker, type JobsOptions } from 'bullmq'
import env from '#start/env'
import { getBullMqConnection } from '#infrastructure/queue/redis_connection'
import type { NotificationJobPayload } from '#modules/documents/domain/notifications/notification_types'
import type { IntelligenceJobPayload } from '#modules/documents/domain/intelligence/intelligence_types'
import type { FileProcessingJobPayload } from '#modules/documents/domain/files/file_processing_types'

export const NOTIFICATION_QUEUE = 'notifications'
export const SLA_QUEUE = 'sla'
export const INTELLIGENCE_QUEUE = 'document_intelligence'
export const FILE_PROCESSING_QUEUE = 'file_processing'
export const RETENTION_QUEUE = 'retention_alerts'

const defaultJobOptions: JobsOptions = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 2000 },
  removeOnComplete: 1000,
  removeOnFail: 5000,
}

let notificationQueue: Queue<NotificationJobPayload> | null = null
let slaQueue: Queue | null = null
let intelligenceQueue: Queue<IntelligenceJobPayload> | null = null
let fileProcessingQueue: Queue<FileProcessingJobPayload> | null = null
let retentionQueue: Queue | null = null

export function getNotificationQueue(): Queue<NotificationJobPayload> {
  if (!notificationQueue) {
    notificationQueue = new Queue<NotificationJobPayload>(NOTIFICATION_QUEUE, {
      connection: getBullMqConnection(),
      prefix: env.get('QUEUE_PREFIX') ?? 'cdts:queue',
      defaultJobOptions,
    })
  }
  return notificationQueue
}

export function getSlaQueue(): Queue {
  if (!slaQueue) {
    slaQueue = new Queue(SLA_QUEUE, {
      connection: getBullMqConnection(),
      prefix: env.get('QUEUE_PREFIX') ?? 'cdts:queue',
      defaultJobOptions,
    })
  }
  return slaQueue
}

export function getIntelligenceQueue(): Queue<IntelligenceJobPayload> {
  if (!intelligenceQueue) {
    intelligenceQueue = new Queue<IntelligenceJobPayload>(INTELLIGENCE_QUEUE, {
      connection: getBullMqConnection(),
      prefix: env.get('QUEUE_PREFIX') ?? 'cdts:queue',
      defaultJobOptions,
    })
  }
  return intelligenceQueue
}

export function getFileProcessingQueue(): Queue<FileProcessingJobPayload> {
  if (!fileProcessingQueue) {
    fileProcessingQueue = new Queue<FileProcessingJobPayload>(FILE_PROCESSING_QUEUE, {
      connection: getBullMqConnection(),
      prefix: env.get('QUEUE_PREFIX') ?? 'cdts:queue',
      defaultJobOptions,
    })
  }
  return fileProcessingQueue
}

export function getRetentionQueue(): Queue {
  if (!retentionQueue) {
    retentionQueue = new Queue(RETENTION_QUEUE, {
      connection: getBullMqConnection(),
      prefix: env.get('QUEUE_PREFIX') ?? 'cdts:queue',
      defaultJobOptions,
    })
  }
  return retentionQueue
}

export type NotificationWorker = Worker<NotificationJobPayload>
export type SlaWorker = Worker
export type IntelligenceWorker = Worker<IntelligenceJobPayload>
export type FileProcessingWorker = Worker<FileProcessingJobPayload>
export type RetentionWorker = Worker

export function createNotificationWorker(
  processor: (job: NotificationJobPayload) => Promise<void>
): NotificationWorker {
  return new Worker<NotificationJobPayload>(
    NOTIFICATION_QUEUE,
    async (job) => processor(job.data),
    {
      connection: getBullMqConnection(),
      prefix: env.get('QUEUE_PREFIX') ?? 'cdts:queue',
      concurrency: Number(env.get('QUEUE_CONCURRENCY') ?? 10),
    }
  )
}

export function createSlaWorker(processor: () => Promise<void>): SlaWorker {
  return new Worker(
    SLA_QUEUE,
    async () => processor(),
    {
      connection: getBullMqConnection(),
      prefix: env.get('QUEUE_PREFIX') ?? 'cdts:queue',
      concurrency: 1,
    }
  )
}

export function createIntelligenceWorker(
  processor: (job: IntelligenceJobPayload) => Promise<void>
): IntelligenceWorker {
  return new Worker<IntelligenceJobPayload>(
    INTELLIGENCE_QUEUE,
    async (job) => processor(job.data),
    {
      connection: getBullMqConnection(),
      prefix: env.get('QUEUE_PREFIX') ?? 'cdts:queue',
      concurrency: Number(env.get('INTELLIGENCE_QUEUE_CONCURRENCY') ?? 5),
    }
  )
}

export function createFileProcessingWorker(
  processor: (job: FileProcessingJobPayload) => Promise<void>
): FileProcessingWorker {
  return new Worker<FileProcessingJobPayload>(
    FILE_PROCESSING_QUEUE,
    async (job) => processor(job.data),
    {
      connection: getBullMqConnection(),
      prefix: env.get('QUEUE_PREFIX') ?? 'cdts:queue',
      concurrency: Number(env.get('FILE_PROCESSING_QUEUE_CONCURRENCY') ?? 5),
    }
  )
}

export function createRetentionWorker(processor: () => Promise<void>): RetentionWorker {
  return new Worker(
    RETENTION_QUEUE,
    async () => processor(),
    {
      connection: getBullMqConnection(),
      prefix: env.get('QUEUE_PREFIX') ?? 'cdts:queue',
      concurrency: 1,
    }
  )
}
