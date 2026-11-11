import { emitHttpNotify } from './http-notify-bridge'
import { isTechnicalUserMessage, toUserFriendlyMessage } from './user-facing-errors'

export async function readFetchErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.clone().json()) as Record<string, unknown>
    if (typeof body.message === 'string' && body.message.trim()) return body.message
    if (typeof body.error === 'string' && body.error.trim()) return body.error
  } catch {
    /* not JSON */
  }
  return 'Something went wrong. Please try again.'
}

export async function notifyFetchResponseError(
  response: Response,
  fallback?: string
): Promise<void> {
  if (response.ok) return
  const raw = fallback ?? (await readFetchErrorMessage(response))
  emitHttpNotify({
    title: 'Something went wrong',
    description: toUserFriendlyMessage(raw, 'generic'),
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
      const description = isTechnicalUserMessage(body.message)
        ? 'Your changes were saved.'
        : toUserFriendlyMessage(body.message, 'generic')
      emitHttpNotify({ title: 'Success', description, tone: 'success' })
    }
  } catch {
    /* ignore */
  }
}
