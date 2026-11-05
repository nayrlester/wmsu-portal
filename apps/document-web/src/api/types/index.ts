export type { ApiErrorCode, ValidationFieldError, ApiErrorPayload, ApiErrorResponseBody } from './api-error.types'

export type ApiListParams = Record<string, string | number | boolean | undefined>

export type ApiMutationResult<T = void> = Promise<T>
