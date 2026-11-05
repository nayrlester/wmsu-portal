import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { randomUUID } from 'node:crypto'

export default class RequestIdMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const requestId = ctx.request.header('x-request-id') ?? randomUUID()
    ctx.requestId = requestId
    ctx.response.header('X-Request-Id', requestId)
    await next()
  }
}

declare module '@adonisjs/core/http' {
  interface HttpContext {
    requestId?: string
  }
}
