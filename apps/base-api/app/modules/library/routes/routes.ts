/*
|--------------------------------------------------------------------------
| Routes entry point
|--------------------------------------------------------------------------
|
| Global routes (health) live here. Versioned API routes are registered
| from start/routes/v1/.
|
*/

import router from '@adonisjs/core/services/router'
import { checkRedisConnection } from '#modules/library/services/redis/redis_service'
import '#modules/library/routes/routes/v1/index'

router.get('/api/v1/library/_engine_health', async () => {
  const redisOk = await checkRedisConnection()
  return {
    success: true,
    data: {
      status: 'ok',
      redis: redisOk ? 'connected' : 'unavailable',
      timestamp: new Date().toISOString(),
    },
  }
})
