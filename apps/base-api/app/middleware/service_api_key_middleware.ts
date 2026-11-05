import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import env from '#start/env'

export default class ServiceApiKeyMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const expected = env.get('SERVICE_API_KEY')
    const provided = ctx.request.header('x-service-api-key')
    if (!expected || !provided || provided !== expected) {
      return ctx.response.unauthorized({
        success: false,
        message: 'Service API key required',
        data: { errors: [{ field: 'X-Service-Api-Key', message: 'Invalid or missing' }] },
      })
    }
    ctx.integrationActor = {
      type: 'service',
      id: ctx.request.header('x-source-system') ?? 'unknown-service',
      sourceSystem: ctx.request.header('x-source-system') ?? 'unknown-service',
    }
    return next()
  }
}

declare module '@adonisjs/core/http' {
  interface HttpContext {
    integrationActor?: { type: string; id: string; sourceSystem: string }
  }
}
