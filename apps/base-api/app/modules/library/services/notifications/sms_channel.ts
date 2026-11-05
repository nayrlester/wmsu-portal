import env from '#start/env'
import logger from '@adonisjs/core/services/logger'
import type { SendNotificationInput } from '#modules/library/services/notifications/notification_types'

export interface SmsSendResult {
  success: boolean
  providerId?: string
  error?: string
}

export default class SmsChannel {
  async send(input: SendNotificationInput): Promise<SmsSendResult> {
    const phone = input.phone
    if (!phone) {
      return { success: false, error: 'No phone number for recipient' }
    }

    const accountSid = env.get('TWILIO_ACCOUNT_SID')
    const authToken = env.get('TWILIO_AUTH_TOKEN')
    const from = env.get('TWILIO_FROM_NUMBER')

    if (!accountSid || !authToken || !from) {
      logger.info(
        {
          channel: 'sms',
          to: phone.replace(/\d(?=\d{4})/g, '*'),
          eventType: input.eventType,
        },
        'SMS skipped: Twilio not configured'
      )
      return { success: false, error: 'Twilio not configured' }
    }

    try {
      const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64')
      const body = new URLSearchParams({
        To: phone,
        From: from,
        Body: `${input.title}\n${input.body}`.slice(0, 1500),
      })
      const res = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body,
        }
      )
      const json = (await res.json()) as { sid?: string; message?: string }
      if (!res.ok) {
        return { success: false, error: json.message || `Twilio HTTP ${res.status}` }
      }
      return { success: true, providerId: json.sid }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Twilio send failed'
      logger.error({ err: error }, 'SMS Twilio send failed')
      return { success: false, error: message }
    }
  }
}
