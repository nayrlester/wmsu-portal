import app from '@adonisjs/core/services/app'
import env from '#start/env'
import type { FileProcessingJobPayload } from '#modules/documents/domain/files/file_processing_types'
import { getFileProcessingQueue } from '#infrastructure/queue/queues'
import { processFileProcessing } from '#jobs/file_processing_job'

export async function enqueueFileProcessing(payload: FileProcessingJobPayload): Promise<void> {
  if (env.get('QUEUE_SYNC') || app.inTest) {
    await processFileProcessing(payload)
    return
  }

  await getFileProcessingQueue().add('process', payload, {
    jobId: `file-${payload.fileId}`,
    removeOnComplete: true,
  })
}
