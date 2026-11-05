import { Queue } from 'bullmq'
import env from '#start/env'

let queue: Queue | null = null

function getQueue(): Queue {
  if (!queue) {
    queue = new Queue(env.get('QUEUE_NAME') ?? 'wmsu-cis-jobs', {
      connection: {
        host: env.get('REDIS_HOST'),
        port: env.get('REDIS_PORT'),
        password: env.get('REDIS_PASSWORD'),
        maxRetriesPerRequest: null,
      },
    })
  }
  return queue
}

export async function enqueueInfraPing(): Promise<string | null> {
  try {
    const job = await getQueue().add(
      'infra.ping',
      { source: 'api', at: new Date().toISOString() },
      { removeOnComplete: 100, removeOnFail: 50 }
    )
    return String(job.id ?? '')
  } catch {
    return null
  }
}
