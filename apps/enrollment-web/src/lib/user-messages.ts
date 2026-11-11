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

export function admitErrorNotification(err: unknown): {
  tone: 'danger'
  title: string
  description: string
} {
  return notifyGenericError(err, 'admit')
}

export type UserToast = {
  tone: 'success' | 'warning' | 'danger'
  title: string
  description: string
}

export function notifyGenericError(
  err: unknown,
  action: UserFacingAction = 'generic'
): UserToast {
  return {
    tone: 'danger',
    title: 'Something went wrong',
    description: friendlyApiError(err, action),
  }
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
