import app from '@adonisjs/core/services/app'
import { type HttpContext, ExceptionHandler } from '@adonisjs/core/http'
import TenantNotFoundException from '#modules/library/exceptions/tenant_not_found_exception'
import UnauthorizedException from '#modules/library/exceptions/unauthorized_exception'
import ForbiddenException from '#modules/library/exceptions/forbidden_exception'
import BusinessRuleException from '#modules/library/exceptions/business_rule_exception'
import RateLimitException from '#modules/library/exceptions/rate_limit_exception'
import NotFoundException from '#modules/library/exceptions/not_found_exception'

function isRowNotFound(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const err = error as { code?: string; message?: string }
  return err.code === 'E_ROW_NOT_FOUND' || err.message === 'Row not found'
}

export default class HttpExceptionHandler extends ExceptionHandler {
  protected debug = !app.inProduction

  async handle(error: unknown, ctx: HttpContext) {
    const requestId = ctx.requestId

    if (error instanceof TenantNotFoundException) {
      return ctx.response.status(404).json({
        success: false,
        message: error.message,
        code: TenantNotFoundException.code,
        requestId,
      })
    }

    if (error instanceof NotFoundException || isRowNotFound(error)) {
      return ctx.response.status(404).json({
        success: false,
        message: error instanceof Error ? error.message : 'Resource not found',
        code: NotFoundException.code,
        requestId,
      })
    }

    if (error instanceof UnauthorizedException) {
      return ctx.response.status(401).json({
        success: false,
        message: error.message,
        code: UnauthorizedException.code,
        requestId,
      })
    }

    if (error instanceof ForbiddenException) {
      return ctx.response.status(403).json({
        success: false,
        message: error.message,
        code: ForbiddenException.code,
        requestId,
      })
    }

    if (error instanceof BusinessRuleException) {
      return ctx.response.status(422).json({
        success: false,
        message: error.message,
        code: BusinessRuleException.code,
        requestId,
      })
    }

    if (error instanceof RateLimitException) {
      return ctx.response.status(429).json({
        success: false,
        message: error.message,
        code: RateLimitException.code,
        requestId,
      })
    }

    if (this.debug && error instanceof Error) {
      return ctx.response.status(500).json({
        success: false,
        message: error.message,
        code: 'INTERNAL_ERROR',
        requestId,
        stack: error.stack,
      })
    }

    return ctx.response.status(500).json({
      success: false,
      message: 'An unexpected error occurred',
      code: 'INTERNAL_ERROR',
      requestId,
    })
  }

  async report(error: unknown, ctx: HttpContext) {
    return super.report(error, ctx)
  }
}
