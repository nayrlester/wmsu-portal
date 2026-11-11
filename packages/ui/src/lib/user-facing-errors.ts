const TECHNICAL =
  /identity|provision|HTTP \d{3}|api\/v1|service.?api|econnrefused|ENOENT|uuid|platform user|x-service|wmsu-|port \d{4}|adonis|vine\.|gateway|upstream|base api|identity \(/i

export type UserFacingAction = 'generic' | 'admit' | 'save' | 'load'

export function isTechnicalUserMessage(message: string): boolean {
  const trimmed = message.trim()
  if (!trimmed) return false
  if (trimmed.length > 160) return true
  return TECHNICAL.test(trimmed)
}

function softenKnownPhrases(message: string): string {
  const map: Array<[RegExp, string]> = [
    [/cannot reach the server/i, 'We could not reach the server. Try again in a moment.'],
    [/cannot reach usis|enrollment service/i, 'We could not reach the enrollment service. Try again in a moment.'],
    [/network error|failed to fetch/i, 'Connection problem. Check your internet and try again.'],
    [/unauthorized|401/i, 'Your session may have expired. Sign in again.'],
    [/forbidden|403/i, 'You do not have permission for this action.'],
    [/not found|404/i, 'That record could not be found.'],
    [/duplicate|409/i, 'This record already exists.'],
    [/validation|422/i, 'Some details are missing or invalid. Review the form and try again.'],
    [/timed out|502|504/i, 'The server took too long to respond. Try again.'],
    [/503|unavailable/i, 'The service is temporarily unavailable. Try again later.'],
  ]
  for (const [pattern, friendly] of map) {
    if (pattern.test(message)) return friendly
  }
  return message
}

export function toUserFriendlyMessage(
  raw: string,
  action: UserFacingAction = 'generic'
): string {
  const softened = softenKnownPhrases(raw.trim())
  if (!isTechnicalUserMessage(softened)) {
    return softened || 'Something went wrong. Please try again.'
  }
  switch (action) {
    case 'admit':
      return 'This action could not be completed. Please try again or contact support.'
    case 'save':
      return 'Your changes could not be saved. Please try again.'
    case 'load':
      return 'This page could not be loaded. Refresh and try again.'
    default:
      return 'Something went wrong. Please try again.'
  }
}

export function friendlyMailNoticeReason(reason: string | null | undefined): string | null {
  if (!reason?.trim()) return null
  const r = reason.trim()
  if (/no email address/i.test(r)) {
    return 'No email was on file, so no message was sent.'
  }
  if (/not configured/i.test(r)) {
    return 'Email is not set up yet. Share details with the user another way.'
  }
  if (/not delivered/i.test(r)) {
    return 'The email could not be delivered. Try another way to reach them.'
  }
  if (isTechnicalUserMessage(r)) {
    return 'A notification email could not be sent.'
  }
  return toUserFriendlyMessage(r, 'generic')
}

export function genericErrorToast(description: string): {
  tone: 'danger'
  title: string
  description: string
} {
  return {
    tone: 'danger',
    title: 'Something went wrong',
    description: toUserFriendlyMessage(description, 'generic'),
  }
}

export function genericSuccessToast(detail?: string | null): {
  tone: 'success'
  title: string
  description: string
} {
  const text = detail?.trim()
  const description =
    text && !isTechnicalUserMessage(text) ? toUserFriendlyMessage(text, 'generic') : 'Your request was completed successfully.'
  return {
    tone: 'success',
    title: 'Success',
    description,
  }
}
