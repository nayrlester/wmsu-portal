import app from '@adonisjs/core/services/app'
import { HttpContext, ExceptionHandler } from '@adonisjs/core/http'
import { errors as vineErrors } from '@vinejs/vine'
import { errorEnvelope, IntegrationError } from '#services/integration_envelope'

export default class HttpExceptionHandler extends ExceptionHandler {
  protected debug = !app.inProduction

  async handle(error: unknown, ctx: HttpContext) {
    if (error instanceof IntegrationError) {
      return ctx.response.status(error.status).send(errorEnvelope(error.message, error.errors))
    }

    if (error instanceof vineErrors.E_VALIDATION_ERROR) {
      const messages = (error.messages as Array<{ field?: string; message: string; rule?: string }>) ?? []
      return ctx.response.unprocessableEntity(
        errorEnvelope(
          'Validation failed',
          messages.map((m) => ({ field: m.field, message: m.message }))
        )
      )
    }

    return super.handle(error, ctx)
  }

  async report(error: unknown, ctx: HttpContext) {
    return super.report(error, ctx)
  }
}
