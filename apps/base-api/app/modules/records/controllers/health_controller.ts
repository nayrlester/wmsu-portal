import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'

export default class HealthController {
  async handle({ response }: HttpContext) {
    let database: 'up' | 'down' = 'up'
    try {
      await db.rawQuery('select 1')
    } catch {
      database = 'down'
    }

    const body = {
      status: database === 'up' ? 'ok' : 'degraded',
      service: 'records',
      checks: { database },
      timestamp: new Date().toISOString(),
    }

    if (database === 'down') {
      return response.status(503).send(body)
    }
    return response.ok(body)
  }
}
