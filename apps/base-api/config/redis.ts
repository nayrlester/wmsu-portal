import env from '#start/env'

const redisConfig = {
  host: env.get('REDIS_HOST'),
  port: env.get('REDIS_PORT'),
  password: env.get('REDIS_PASSWORD') || undefined,
  maxRetriesPerRequest: null as null,
  lazyConnect: true,
}

export default redisConfig
