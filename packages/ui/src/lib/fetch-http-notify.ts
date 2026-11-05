import { emitHttpNotify } from './http-notify-bridge'

export async function readFetchErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.clone().json()) as Record<string, unknown>
    if (typeof body.message === 'string' && body.message.trim()) return body.message
    if (typeof body.error === 'string' && body.error.trim()) return body.error
  } catch {
    /* not JSON */
  }
  return `HTTP ${response.status}`
}

export async function notifyFetchResponseError(
  response: Response,
  fallback?: string
): Promise<void> {
  if (response.ok) return
  const description = fallback ?? (await readFetchErrorMessage(response))
  emitHttpNotify({
    title: 'Request failed',
    description,
    tone: 'danger',
  })
}

export async function notifyFetchJsonSuccess(
  response: Response,
  method: string
): Promise<void> {
  if (!response.ok) return
  const verb = method.toUpperCase()
  if (verb === 'GET' || verb === 'HEAD' || verb === 'OPTIONS') return
  try {
    const body = (await response.clone().json()) as Record<string, unknown>
    if (typeof body.message === 'string' && body.message.trim()) {
      emitHttpNotify({ title: 'Success', description: body.message, tone: 'success' })
    }
  } catch {
    /* ignore */
  }
}
