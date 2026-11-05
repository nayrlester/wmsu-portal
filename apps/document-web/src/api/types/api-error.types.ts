export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'SERVER_ERROR'
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'UNKNOWN'

export interface ValidationFieldError {
  field: string
  message: string
  rule?: string
}

export interface ApiErrorPayload {
  message: string
  status: number
  code: ApiErrorCode
  serverCode?: string
  validationErrors?: ValidationFieldError[]
  raw?: unknown
}

export interface ApiErrorResponseBody {
  error?: string
  message?: string
  code?: string
  errors?: Array<{ field?: string; message?: string; rule?: string } | ValidationFieldError>
}
