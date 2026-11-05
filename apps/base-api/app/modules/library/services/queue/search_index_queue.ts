import { Queue, Worker, type JobsOptions } from 'bullmq'
import redisConfig from '#config/redis'
import type { IndexJobPayload } from '#modules/library/services/search/search_indexer_service'

const connection = {
  host: redisConfig.host,
  port: redisConfig.port,
  password: redisConfig.password,
}

export const SEARCH_INDEX_QUEUE = 'librastack-search-index'

let searchIndexQueue: Queue<IndexJobPayload> | null = null

export function getSearchIndexQueue() {
  if (!searchIndexQueue) {
    searchIndexQueue = new Queue<IndexJobPayload>(SEARCH_INDEX_QUEUE, { connection })
  }
  return searchIndexQueue
}

export async function enqueueSearchIndex(data: IndexJobPayload, opts?: JobsOptions) {
  const queue = getSearchIndexQueue()
  await queue.add('index-document', data, {
    removeOnComplete: 200,
    removeOnFail: 50,
    ...opts,
  })
}

export function startSearchIndexWorker() {
  return new Worker<IndexJobPayload>(
    SEARCH_INDEX_QUEUE,
    async (job) => {
      const { default: SearchIndexerService } = await import('#modules/library/services/search/search_indexer_service')
      const indexer = new SearchIndexerService()

      if (job.data.action === 'delete') {
        await indexer.deleteEntity(job.data.tenantId, job.data.entityType, job.data.entityId)
        return { deleted: true }
      }

      await indexer.indexEntity(job.data.tenantId, job.data.entityType, job.data.entityId)
      return { indexed: true }
    },
    { connection }
  )
}

export async function closeSearchIndexQueue() {
  await searchIndexQueue?.close()
  searchIndexQueue = null
}
