import app from '@adonisjs/core/services/app'
import { errors } from '@adonisjs/auth'
import { ExceptionHandler, type HttpContext } from '@adonisjs/core/http'
import {
  PlanLimitExceededException,
  TenantAccessDeniedException,
  TenantContextMissingException,
  TenantNotFoundException,
} from '#modules/documents/domain/exceptions/tenant_exceptions'
import {
  BillingNotConfiguredException,
  BillingOperationException,
  InvalidCouponException,
  WebhookVerificationException,
} from '#modules/documents/domain/exceptions/billing_exceptions'
import {
  CatalogCodeAlreadyExistsException,
  CatalogEntityInUseException,
  CatalogEntityNotFoundException,
} from '#modules/documents/domain/exceptions/catalog_exceptions'
import {
  DocumentNotFoundException,
  InvalidDocumentStateException,
} from '#modules/documents/domain/documents/document_exceptions'
import {
  FileNotFoundException,
  FileTooLargeException,
  FileUploadNotAllowedException,
  InvalidFileTypeException,
  VirusDetectedException,
} from '#modules/documents/domain/files/file_exceptions'
import {
  WorkflowNotFoundException,
  InvalidWorkflowDefinitionException,
  InvalidWorkflowStateException,
  WorkflowInstanceNotFoundException,
  ApprovalNotAllowedException,
} from '#modules/documents/domain/workflows/workflow_exceptions'
import {
  RoutingNotAllowedException,
  InvalidForwardTargetException,
} from '#modules/documents/domain/routing/routing_exceptions'
import {
  UserAlreadyExistsException,
  UserNotFoundException,
  UserOperationForbiddenException,
} from '#modules/documents/domain/exceptions/user_exceptions'

export default class HttpExceptionHandler extends ExceptionHandler {
  protected debug = !app.inProduction

  async handle(error: unknown, ctx: HttpContext) {
    if (error instanceof errors.E_INVALID_CREDENTIALS) {
      return ctx.response.unauthorized({ error: 'Invalid credentials' })
    }

    if (error instanceof PlanLimitExceededException) {
      return ctx.response.forbidden({
        error: error.message,
        code: 'PLAN_LIMIT_EXCEEDED',
        limitType: error.limitType,
      })
    }

    if (error instanceof TenantAccessDeniedException) {
      return ctx.response.forbidden({ error: error.message, code: 'TENANT_ACCESS_DENIED' })
    }

    if (error instanceof TenantNotFoundException) {
      return ctx.response.notFound({ error: error.message, code: 'TENANT_NOT_FOUND' })
    }

    if (error instanceof TenantContextMissingException) {
      return ctx.response.forbidden({ error: error.message, code: 'TENANT_CONTEXT_MISSING' })
    }

    if (error instanceof DocumentNotFoundException) {
      return ctx.response.notFound({ error: error.message, code: 'DOCUMENT_NOT_FOUND' })
    }

    if (error instanceof InvalidDocumentStateException) {
      return ctx.response.unprocessableEntity({
        error: error.message,
        code: 'INVALID_DOCUMENT_STATE',
      })
    }

    if (error instanceof FileNotFoundException) {
      return ctx.response.notFound({ error: error.message, code: 'FILE_NOT_FOUND' })
    }

    if (error instanceof InvalidFileTypeException || error instanceof FileUploadNotAllowedException) {
      return ctx.response.unprocessableEntity({ error: error.message, code: error.code })
    }

    if (error instanceof FileTooLargeException) {
      return ctx.response.payloadTooLarge({ error: error.message, code: 'FILE_TOO_LARGE' })
    }

    if (error instanceof VirusDetectedException) {
      return ctx.response.unprocessableEntity({ error: error.message, code: 'VIRUS_DETECTED' })
    }

    if (error instanceof WorkflowNotFoundException || error instanceof WorkflowInstanceNotFoundException) {
      return ctx.response.notFound({ error: error.message, code: error.code })
    }

    if (error instanceof InvalidWorkflowDefinitionException) {
      return ctx.response.unprocessableEntity({
        error: error.message,
        code: error.code,
        errors: error.errors,
      })
    }

    if (error instanceof InvalidWorkflowStateException) {
      return ctx.response.unprocessableEntity({ error: error.message, code: error.code })
    }

    if (error instanceof ApprovalNotAllowedException) {
      return ctx.response.forbidden({ error: error.message, code: error.code })
    }

    if (error instanceof RoutingNotAllowedException || error instanceof InvalidForwardTargetException) {
      return ctx.response.unprocessableEntity({ error: error.message, code: error.code })
    }

    if (error instanceof UserNotFoundException) {
      return ctx.response.notFound({ error: error.message, code: 'USER_NOT_FOUND' })
    }

    if (error instanceof UserAlreadyExistsException) {
      return ctx.response.conflict({ error: error.message, code: 'USER_ALREADY_EXISTS' })
    }

    if (error instanceof UserOperationForbiddenException) {
      return ctx.response.forbidden({ error: error.message, code: 'USER_OPERATION_FORBIDDEN' })
    }

    if (error instanceof InvalidCouponException) {
      return ctx.response.unprocessableEntity({ error: error.message, code: 'INVALID_COUPON' })
    }

    if (error instanceof BillingOperationException) {
      return ctx.response.unprocessableEntity({ error: error.message, code: 'BILLING_OPERATION' })
    }

    if (error instanceof BillingNotConfiguredException) {
      return ctx.response.serviceUnavailable({ error: error.message, code: 'BILLING_NOT_CONFIGURED' })
    }

    if (error instanceof WebhookVerificationException) {
      return ctx.response.badRequest({ error: error.message, code: 'WEBHOOK_VERIFICATION' })
    }

    if (error instanceof CatalogEntityNotFoundException) {
      return ctx.response.notFound({ error: error.message, code: error.code })
    }

    if (error instanceof CatalogCodeAlreadyExistsException) {
      return ctx.response.unprocessableEntity({ error: error.message, code: error.code })
    }

    if (error instanceof CatalogEntityInUseException) {
      return ctx.response.conflict({ error: error.message, code: error.code })
    }

    if (error && typeof error === 'object' && 'code' in error && error.code === 'E_TOO_MANY_REQUESTS') {
      return ctx.response.tooManyRequests({ error: 'Too many requests' })
    }

    return super.handle(error, ctx)
  }

  async report(error: unknown, ctx: HttpContext) {
    return super.report(error, ctx)
  }
}
