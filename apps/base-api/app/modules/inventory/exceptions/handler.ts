import app from '@adonisjs/core/services/app'
import { errors } from '@adonisjs/auth'
import { ExceptionHandler, type HttpContext } from '@adonisjs/core/http'

export default class HttpExceptionHandler extends ExceptionHandler {
  protected debug = !app.inProduction

  async handle(error: unknown, ctx: HttpContext) {
    if (error instanceof errors.E_INVALID_CREDENTIALS) {
      return ctx.response.unauthorized({ error: 'Invalid credentials' })
    }

    if (error instanceof errors.E_UNAUTHORIZED_ACCESS) {
      const message =
        'message' in error && typeof error.message === 'string' && error.message
          ? error.message
          : 'Unauthorized'
      const detail = message && message !== 'Unauthorized access' ? message : 'Unauthorized'
      // Include both keys — SPA SSO reads `error` or `message`.
      return ctx.response.unauthorized({ error: detail, message: detail })
    }

    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'E_ROW_NOT_FOUND'
    ) {
      return ctx.response.notFound({ error: 'Resource not found' })
    }

    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'E_TOO_MANY_REQUESTS'
    ) {
      return ctx.response.tooManyRequests({ error: 'Too many requests' })
    }

    if (error instanceof Error && error.message.startsWith('Insufficient stock')) {
      return ctx.response.unprocessableEntity({ error: error.message, code: 'INSUFFICIENT_STOCK' })
    }

    if (error instanceof Error && error.message.includes('already assigned')) {
      return ctx.response.conflict({ error: error.message, code: 'ASSET_ALREADY_ASSIGNED' })
    }

    return super.handle(error, ctx)
  }

  async report(error: unknown, ctx: HttpContext) {
    return super.report(error, ctx)
  }
}
