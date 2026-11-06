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
    const mobile = philippineMobile(input.phone)
    if (!input.phone) {
      return { success: false, error: 'No phone number for recipient' }
    }
    if (!mobile) {
      return { success: false, error: 'Phone number is not a Philippine mobile' }
    }

    const message = `${input.title}\n${input.body}`.slice(0, 480)
    const masked = maskMobile(mobile)
    const failures: string[] = []

    if (philsmsConfigured()) {
      const result = await sendPhilSms(mobile, message)
      if (result.success) return result
      failures.push(result.error || 'PhilSMS failed')
      logger.info({ to: masked, eventType: input.eventType }, 'PhilSMS failed, trying UniSMS')
    }

    if (unismsConfigured()) {
      const result = await sendUniSms(mobile, message, input.eventType)
      if (result.success) return result
      failures.push(result.error || 'UniSMS failed')
    }

    if (!philsmsConfigured() && !unismsConfigured()) {
      return this.sendTwilio(input, mobile, message)
    }

    return { success: false, error: failures.join('; ') || 'SMS providers not configured' }
  }

  private async sendTwilio(
    input: SendNotificationInput,
    mobile: string,
    message: string
  ): Promise<SmsSendResult> {
    const accountSid = env.get('TWILIO_ACCOUNT_SID')
    const authToken = env.get('TWILIO_AUTH_TOKEN')
    const from = env.get('TWILIO_FROM_NUMBER')
    if (!accountSid || !authToken || !from) {
      logger.info(
        { channel: 'sms', to: maskMobile(mobile), eventType: input.eventType },
        'SMS skipped: PhilSMS, UniSMS, and Twilio are not configured'
      )
      return { success: false, error: 'SMS provider not configured' }
    }

    try {
      const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64')
      const body = new URLSearchParams({ To: `+${mobile}`, From: from, Body: message })
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
      if (!res.ok) return { success: false, error: json.message || `Twilio HTTP ${res.status}` }
      return { success: true, providerId: json.sid }
    } catch (error) {
      const messageText = error instanceof Error ? error.message : 'Twilio send failed'
      logger.error({ err: error }, 'SMS Twilio send failed')
      return { success: false, error: messageText }
    }
  }
}

function philsmsConfigured() {
  return Boolean(env.get('PHILSMS_API_TOKEN') && env.get('PHILSMS_SENDER_ID'))
}

function unismsConfigured() {
  return Boolean(env.get('UNISMS_API_TOKEN'))
}

function philippineMobile(phone?: string | null) {
  const digits = (phone ?? '').replace(/\D/g, '')
  if (digits.startsWith('63') && digits.length === 12) return digits
  if (digits.startsWith('0') && digits.length === 11) return `63${digits.slice(1)}`
  if (digits.length === 10 && digits.startsWith('9')) return `63${digits}`
  return null
}

function maskMobile(mobile: string) {
  return `${mobile.slice(0, 4)}*****${mobile.slice(-2)}`
}

function joinUrl(base: string, path: string) {
  return `${base.replace(/\/$/, '')}/${path.replace(/^\//, '')}`
}

async function readJson(res: Response) {
  const text = await res.text()
  try {
    return { text, json: JSON.parse(text) as Record<string, unknown> }
  } catch {
    return { text, json: {} as Record<string, unknown> }
  }
}

function providerId(json: Record<string, unknown>) {
  const data = json.data
  if (data && typeof data === 'object') {
    const row = data as Record<string, unknown>
    if (typeof row.message_id === 'string') return row.message_id
    if (typeof row.uid === 'string') return row.uid
  }
  const message = json.message
  if (message && typeof message === 'object') {
    const row = message as Record<string, unknown>
    if (typeof row.reference_id === 'string') return row.reference_id
  }
  return undefined
}

function errorText(json: Record<string, unknown>, text: string, status: number) {
  if (typeof json.message === 'string' && json.message.trim()) return json.message
  return text.trim().slice(0, 240) || `HTTP ${status}`
}

async function sendPhilSms(mobile: string, message: string): Promise<SmsSendResult> {
  const token = env.get('PHILSMS_API_TOKEN')
  const senderId = env.get('PHILSMS_SENDER_ID')
  const base = env.get('PHILSMS_API_URL') || 'https://dashboard.philsms.com/api/v3/'
  if (!token || !senderId) return { success: false, error: 'PhilSMS not configured' }
  const endpoint = joinUrl(base, 'sms/send')
  const fallback = 'https://app.philsms.com/api/v3/sms/send'

  try {
    const first = await postPhilSms(endpoint, token, senderId, mobile, message)
    if (first.result.success || first.status !== 404 || endpoint === fallback) return first.result
    return (await postPhilSms(fallback, token, senderId, mobile, message)).result
  } catch (error) {
    const messageText = error instanceof Error ? error.message : 'PhilSMS request failed'
    logger.error({ err: error }, 'PhilSMS send failed')
    return { success: false, error: messageText }
  }
}

async function postPhilSms(
  url: string,
  token: string,
  senderId: string,
  mobile: string,
  message: string
) {
  const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recipient: mobile,
        sender_id: senderId,
        type: 'plain',
        message,
      }),
    })
    const { text, json } = await readJson(res)
    if (!res.ok || json.status === 'error') {
      return {
        status: res.status,
        result: { success: false, error: `PhilSMS: ${errorText(json, text, res.status)}` },
      }
    }
    return {
      status: res.status,
      result: {
        success: true,
        providerId: providerId(json) ? `philsms:${providerId(json)}` : 'philsms',
      },
    }
  }

async function sendUniSms(mobile: string, message: string, eventType: string): Promise<SmsSendResult> {
  const token = env.get('UNISMS_API_TOKEN')
  const base = env.get('UNISMS_API_URL') || 'https://unismsapi.com/api'
  const senderId = env.get('UNISMS_SENDER_ID') || 'Unisoft'
  if (!token) return { success: false, error: 'UniSMS not configured' }

  try {
    const res = await fetch(joinUrl(base, 'sms'), {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${token}:`).toString('base64')}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recipient: `+${mobile}`,
        sender_id: senderId,
        content: message.slice(0, 670),
        metadata: { event_type: eventType },
      }),
    })
    const { text, json } = await readJson(res)
    if (!res.ok) {
      return { success: false, error: `UniSMS: ${errorText(json, text, res.status)}` }
    }
    return { success: true, providerId: providerId(json) ? `unisms:${providerId(json)}` : 'unisms' }
  } catch (error) {
    const messageText = error instanceof Error ? error.message : 'UniSMS request failed'
    logger.error({ err: error }, 'UniSMS send failed')
    return { success: false, error: messageText }
  }
}
