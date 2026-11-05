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

export default class ServiceApiKeyMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const expected = env.get('SERVICE_API_KEY')
    if (!expected?.trim()) {
      return ctx.response.serviceUnavailable({
        success: false,
        message: 'SERVICE_API_KEY is not configured',
        code: 'SERVICE_KEY_UNCONFIGURED',
      })
    }

    const provided =
      ctx.request.header('x-service-api-key') ?? ctx.request.header('X-Service-Api-Key')

    if (!provided || !apiKeysMatch(provided, expected)) {
      return ctx.response.unauthorized({
        success: false,
        message: 'Invalid or missing service API key',
        code: 'SERVICE_UNAUTHORIZED',
      })
    }

    await next()
  }
}
