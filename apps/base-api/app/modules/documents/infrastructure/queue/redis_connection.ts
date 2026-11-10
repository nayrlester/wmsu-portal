import env from '#start/env'
import { Redis } from 'ioredis'

let sharedConnection: Redis | null = null
let pubConnection: Redis | null = null
let subConnection: Redis | null = null

function buildRedisOptions() {
  return {
    host: env.get('REDIS_HOST'),
    port: env.get('REDIS_PORT'),
    password: env.get('REDIS_PASSWORD') || undefined,
    maxRetriesPerRequest: null as null,
    lazyConnect: true,
  }
}

function createRedisClient(): Redis {
  const connection = new Redis(buildRedisOptions())
  // Prevent noisy "Unhandled error event" logs when Redis is down.
  connection.on('error', () => {})
  return connection
}

export function getBullMqConnection(): Redis {
  if (!sharedConnection) {
    sharedConnection = createRedisClient()
  }
  return sharedConnection
}

export function getSocketIoPubSubConnections(): { pub: Redis; sub: Redis } {
  if (!pubConnection) {
    pubConnection = createRedisClient()
    subConnection = createRedisClient()
  }
  return { pub: pubConnection!, sub: subConnection! }
}

export async function closeQueueConnections(): Promise<void> {
  const connections = [sharedConnection, pubConnection, subConnection].filter(Boolean) as Redis[]
  await Promise.all(connections.map((connection) => connection.quit()))
  sharedConnection = null
  pubConnection = null
  subConnection = null
}
