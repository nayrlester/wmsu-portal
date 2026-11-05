import env from '#start/env'
import logger from '@adonisjs/core/services/logger'

export type EmailJsSendInput = {
  toEmail: string
  toName?: string | null
  subject: string
  message: string
  replyTo?: string | null
  extraParams?: Record<string, string | number | boolean | null | undefined>
}

export type EmailJsSendResult = {
  success: boolean
  skipped?: boolean
  providerStatus?: number
  error?: string
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export class EmailJsMailerService {
  isConfigured() {
    return Boolean(
      env.get('EMAILJS_SERVICE_ID') &&
        env.get('EMAILJS_TEMPLATE_ID') &&
        env.get('EMAILJS_PUBLIC_KEY') &&
        env.get('EMAILJS_PRIVATE_KEY')
    )
  }

  async send(input: EmailJsSendInput): Promise<EmailJsSendResult> {
    const to = input.toEmail?.trim().toLowerCase()
    if (!to) {
      return { success: false, error: 'Missing recipient email' }
    }

    const serviceId = env.get('EMAILJS_SERVICE_ID')
    const templateId = env.get('EMAILJS_TEMPLATE_ID')
    const publicKey = env.get('EMAILJS_PUBLIC_KEY')
    const privateKey = env.get('EMAILJS_PRIVATE_KEY')

    if (!serviceId || !templateId || !publicKey || !privateKey) {
      logger.info({ to, subject: input.subject }, 'EmailJS skipped: credentials not configured')
      return { success: false, skipped: true, error: 'EmailJS not configured' }
    }

    const fromName = env.get('MAIL_FROM_NAME') || env.get('APP_NAME') || 'WMSU CIS'
    const templateParams: Record<string, string> = {
      to_email: to,
      email: to,
      to_name: (input.toName || to.split('@')[0] || 'User').trim(),
      subject: input.subject,
      title: input.subject,
      message: input.message,
      body: input.message,
      from_name: fromName,
    }
    if (input.replyTo) templateParams.reply_to = input.replyTo
    for (const [key, value] of Object.entries(input.extraParams ?? {})) {
      if (value == null) continue
      templateParams[key] = String(value)
    }

    try {
      const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: serviceId,
          template_id: templateId,
          user_id: publicKey,
          accessToken: privateKey,
          template_params: templateParams,
        }),
      })
      const text = await response.text().catch(() => '')
      if (!response.ok) {
        logger.error(
          { to, status: response.status, body: text.slice(0, 400) },
          'EmailJS send failed'
        )
        return {
          success: false,
          providerStatus: response.status,
          error: text || `EmailJS HTTP ${response.status}`,
        }
      }
      logger.info({ to, subject: input.subject }, 'EmailJS send ok')
      return { success: true, providerStatus: response.status }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'EmailJS request failed'
      logger.error({ err: error, to }, 'EmailJS send exception')
      return { success: false, error: message }
    }
  }

  async sendMany(
    inputs: EmailJsSendInput[],
    options?: { minIntervalMs?: number }
  ): Promise<EmailJsSendResult[]> {
    const interval = options?.minIntervalMs ?? 1100
    const results: EmailJsSendResult[] = []
    for (let i = 0; i < inputs.length; i++) {
      if (i > 0) await sleep(interval)
      results.push(await this.send(inputs[i]!))
    }
    return results
  }
}

export const emailJsMailerService = new EmailJsMailerService()
