export function ok<T>(data: T, message = 'OK', meta: Record<string, unknown> = {}) {
  return { success: true as const, message, data, meta }
}

export function fail(message: string, data: Record<string, unknown> = {}) {
  return { success: false as const, message, data, meta: {} }
}
