import axios from 'axios'
import {
  isTechnicalUserMessage,
  toUserFriendlyMessage,
  userFacingAxiosError,
  type UserFacingAction,
} from '@wmsu/ui'

export { friendlyMailNoticeReason } from '@wmsu/ui'

export function friendlyApiError(err: unknown, action: UserFacingAction = 'generic'): string {
  if (axios.isAxiosError(err)) {
    return userFacingAxiosError(err, action)
  }
  if (err instanceof Error && err.message.trim()) {
    return toUserFriendlyMessage(err.message, action)
  }
  return toUserFriendlyMessage('', action)
}

export type UserToast = {
  tone: 'success' | 'warning' | 'danger'
  title: string
  description: string
}

export type DangerToast = {
  tone: 'danger'
  title: string
  description: string
}

export function notifyGenericError(
  err: unknown,
  action: UserFacingAction = 'generic'
): DangerToast {
  return {
    tone: 'danger',
    title: 'Something went wrong',
    description: friendlyApiError(err, action),
  }
}

function axiosErrorPayload(err: unknown): { code?: string; message?: string } {
  if (!axios.isAxiosError(err) || !err.response?.data || typeof err.response.data !== 'object') {
    return {}
  }
  const record = err.response.data as Record<string, unknown>
  const code = typeof record.code === 'string' ? record.code : undefined
  const message =
    typeof record.message === 'string' && record.message.trim()
      ? record.message.trim()
      : typeof record.error === 'string' && record.error.trim()
        ? record.error.trim()
        : undefined
  return { code, message }
}

export function sectionGuardErrorNotification(err: unknown): DangerToast {
  const { code, message } = axiosErrorPayload(err)
  if (code === 'E_SECTION_CAPACITY_BELOW_ENROLLED') {
    return {
      tone: 'danger',
      title: 'Capacity too low',
      description:
        message ||
        'Capacity cannot be set below the number of seated students. Transfer or drop seats first.',
    }
  }
  if (code === 'E_SECTION_HAS_ENROLLED') {
    return {
      tone: 'danger',
      title: 'Section still has seats',
      description:
        message ||
        'Cannot close this section while students are seated. Transfer or dissolve first.',
    }
  }
  if (message && /seated|capacity|enrolled/i.test(message) && !isTechnicalUserMessage(message)) {
    return {
      tone: 'danger',
      title: 'Section update blocked',
      description: message,
    }
  }
  return notifyGenericError(err, 'save')
}

export function admitErrorNotification(err: unknown): DangerToast {
  return notifyGenericError(err, 'admit')
}

export function notifyGenericSuccess(detail?: string | null): UserToast {
  const text = detail?.trim()
  return {
    tone: 'success',
    title: 'Success',
    description:
      text && !isTechnicalUserMessage(text) ? text : 'Your request was completed successfully.',
  }
}
