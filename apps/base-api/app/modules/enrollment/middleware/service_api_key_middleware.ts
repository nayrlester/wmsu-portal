import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { timingSafeEqual } from 'node:crypto'
import env from '#start/env'

function apiKeysMatch(provided: string, expected: string): boolean {
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

/**
 * M2M auth for the enterprise document hub.
 * Header: X-Service-Api-Key: <SERVICE_API_KEY>
 */
export default class ServiceApiKeyMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const expected = env.get('SERVICE_API_KEY')
    if (!expected?.trim()) {
      return ctx.response.serviceUnavailable({
        error: 'Document hub is not configured (SERVICE_API_KEY)',
      })
    }

    const provided =
      ctx.request.header('x-service-api-key') ??
      ctx.request.header('authorization')?.replace(/^Bearer\s+/i, '')

    if (!provided || !apiKeysMatch(provided, expected)) {
      return ctx.response.unauthorized({ error: 'Invalid service API key' })
    }

    await next()
  }
}
