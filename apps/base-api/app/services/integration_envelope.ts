export function okEnvelope<T>(data: T, message = 'OK', meta?: Record<string, unknown>) {
  return { success: true as const, message, data, ...(meta ? { meta } : {}) }
}

export function errorEnvelope(
  message: string,
  errors?: Array<{ field?: string; message: string }>,
  data: unknown = null
) {
  return {
    success: false as const,
    message,
    data: errors ? { errors, ...(data && typeof data === 'object' ? data : {}) } : data,
  }
}

export class IntegrationError extends Error {
  constructor(
    message: string,
    readonly status: number = 400,
    readonly errors?: Array<{ field?: string; message: string }>
  ) {
    super(message)
    this.name = 'IntegrationError'
  }
}
