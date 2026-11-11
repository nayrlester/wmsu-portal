import { friendlyMailNoticeReason } from '@wmsu/ui'

export type AdmitAccountNotice = {
  sent?: boolean
  to?: string | null
  reason?: string | null
  provisioned?: boolean
  provisionError?: string | null
  loginEmail?: string
}

export function admitSuccessNotification(notice?: AdmitAccountNotice | null): {
  tone: 'success' | 'warning'
  title: string
  description: string
} {
  if (notice?.provisioned === false) {
    const emailPart = notice.sent
      ? ` A message was sent to ${notice.to}, but it does not include a login password.`
      : (() => {
          const mail = friendlyMailNoticeReason(notice.reason)
          return mail ? ` ${mail}` : ''
        })()
    return {
      tone: 'warning',
      title: 'Admitted — login needs follow-up',
      description: `The student record was created.${emailPart} Ask IT or the registrar to activate the student sign-in before they try to log in.`,
    }
  }

  if (notice?.sent) {
    return {
      tone: 'success',
      title: 'Applicant admitted',
      description: `The student record was created and login details were emailed to ${notice.to}.`,
    }
  }

  const mail = friendlyMailNoticeReason(notice?.reason)
  if (mail) {
    return {
      tone: 'warning',
      title: 'Applicant admitted',
      description: `The student record was created. ${mail}`,
    }
  }

  return {
    tone: 'success',
    title: 'Applicant admitted',
    description: 'The student record was created.',
  }
}
