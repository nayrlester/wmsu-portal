import { describe, expect, it } from 'vitest'
import { ApiError, normalizeAxiosError } from '@/api/errors/api-error'
import axios from 'axios'

describe('ApiError', () => {
  it('maps 422 validation responses', () => {
    const error = normalizeAxiosError(
      new axios.AxiosError('Validation failed', undefined, undefined, undefined, {
        status: 422,
        statusText: 'Unprocessable Entity',
        data: {
          error: 'Validation failed',
          errors: [{ field: 'email', message: 'Invalid email', rule: 'email' }],
        },
        headers: {},
        config: { headers: new axios.AxiosHeaders() },
      })
    )

    expect(error).toBeInstanceOf(ApiError)
    expect(error.status).toBe(422)
    expect(error.code).toBe('VALIDATION_ERROR')
    expect(error.isValidation()).toBe(true)
    expect(error.fieldError('email')).toBe('Invalid email')
  })

  it('maps 401 unauthorized responses', () => {
    const error = normalizeAxiosError(
      new axios.AxiosError('Unauthorized', undefined, undefined, undefined, {
        status: 401,
        statusText: 'Unauthorized',
        data: { error: 'Invalid credentials' },
        headers: {},
        config: { headers: new axios.AxiosHeaders() },
      })
    )

    expect(error.status).toBe(401)
    expect(error.code).toBe('UNAUTHORIZED')
    expect(error.isUnauthorized()).toBe(true)
  })

  it('maps 403 forbidden responses', () => {
    const error = normalizeAxiosError(
      new axios.AxiosError('Forbidden', undefined, undefined, undefined, {
        status: 403,
        statusText: 'Forbidden',
        data: { error: 'Access denied', code: 'TENANT_ACCESS_DENIED' },
        headers: {},
        config: { headers: new axios.AxiosHeaders() },
      })
    )

    expect(error.status).toBe(403)
    expect(error.code).toBe('FORBIDDEN')
    expect(error.serverCode).toBe('TENANT_ACCESS_DENIED')
    expect(error.isForbidden()).toBe(true)
  })

  it('maps 500 server errors', () => {
    const error = normalizeAxiosError(
      new axios.AxiosError('Server error', undefined, undefined, undefined, {
        status: 500,
        statusText: 'Internal Server Error',
        data: { error: 'Something went wrong' },
        headers: {},
        config: { headers: new axios.AxiosHeaders() },
      })
    )

    expect(error.status).toBe(500)
    expect(error.code).toBe('SERVER_ERROR')
    expect(error.isServerError()).toBe(true)
  })

  it('maps network failures', () => {
    const error = normalizeAxiosError(new axios.AxiosError('Network Error'))
    expect(error.code).toBe('NETWORK_ERROR')
    expect(error.status).toBe(0)
  })
})
