import axios from 'axios'
import type { ApiErrorCode, ApiErrorPayload, ApiErrorResponseBody, ValidationFieldError } from '@/api/types/api-error.types'

export class ApiError extends Error {
  readonly status: number
  readonly code: ApiErrorCode
  readonly serverCode?: string
  readonly validationErrors: ValidationFieldError[]
  readonly raw?: unknown

  constructor(payload: ApiErrorPayload) {
    super(payload.message)
    this.name = 'ApiError'
    this.status = payload.status
    this.code = payload.code
    this.serverCode = payload.serverCode
    this.validationErrors = payload.validationErrors ?? []
    this.raw = payload.raw
  }

  isValidation(): boolean {
    return this.code === 'VALIDATION_ERROR'
  }

  isUnauthorized(): boolean {
    return this.status === 401 || this.code === 'UNAUTHORIZED'
  }

  isForbidden(): boolean {
    return this.status === 403 || this.code === 'FORBIDDEN'
  }

  isServerError(): boolean {
    return this.status >= 500 || this.code === 'SERVER_ERROR'
  }

  fieldError(field: string): string | undefined {
    return this.validationErrors.find((entry) => entry.field === field)?.message
  }
}

function mapStatusToCode(status: number): ApiErrorCode {
  if (status === 400 || status === 422) return 'VALIDATION_ERROR'
  if (status === 401) return 'UNAUTHORIZED'
  if (status === 403) return 'FORBIDDEN'
  if (status === 404) return 'NOT_FOUND'
  if (status >= 500) return 'SERVER_ERROR'
  return 'UNKNOWN'
}

function parseValidationErrors(body: ApiErrorResponseBody | undefined): ValidationFieldError[] {
  if (!body?.errors?.length) return []

  return body.errors.map((entry) => ({
    field: entry.field ?? 'unknown',
    message: entry.message ?? 'Invalid value',
    rule: entry.rule,
  }))
}

function extractMessage(body: ApiErrorResponseBody | undefined, fallback: string): string {
  return body?.error ?? body?.message ?? fallback
}

export function normalizeAxiosError(error: unknown): ApiError {
  if (error instanceof ApiError) return error

  if (axios.isAxiosError(error)) {
    if (error.code === 'ECONNABORTED') {
      return new ApiError({
        message: 'Request timed out. Please try again.',
        status: 408,
        code: 'TIMEOUT',
        raw: error,
      })
    }

    if (!error.response) {
      return new ApiError({
        message: 'Network error. Check your connection and try again.',
        status: 0,
        code: 'NETWORK_ERROR',
        raw: error,
      })
    }

    const status = error.response.status
    const body = error.response.data as ApiErrorResponseBody | undefined
    const code = mapStatusToCode(status)

    return new ApiError({
      message: extractMessage(body, error.message),
      status,
      code,
      serverCode: body?.code,
      validationErrors: parseValidationErrors(body),
      raw: body,
    })
  }

  if (error instanceof Error) {
    return new ApiError({
      message: error.message,
      status: 0,
      code: 'UNKNOWN',
      raw: error,
    })
  }

  return new ApiError({
    message: 'An unexpected error occurred',
    status: 0,
    code: 'UNKNOWN',
    raw: error,
  })
}
