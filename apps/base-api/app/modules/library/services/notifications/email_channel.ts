import net from 'node:net'
import tls from 'node:tls'
import env from '#start/env'
import logger from '@adonisjs/core/services/logger'
import type { SendNotificationInput } from '#modules/library/services/notifications/notification_types'
import { emailJsMailerService } from '#modules/common-platform/services/emailjs_mailer_service'

export interface EmailSendResult {
  success: boolean
  providerId?: string
  error?: string
}

type SocketLike = net.Socket

function connectSocket(host: string, port: number, secure: boolean): Promise<SocketLike> {
  return new Promise((resolve, reject) => {
    const socket = secure
      ? tls.connect({ host, port, servername: host }, () => resolve(socket))
      : net.connect({ host, port }, () => resolve(socket))
    socket.once('error', reject)
  })
}

function upgradeToTls(socket: SocketLike, host: string): Promise<SocketLike> {
  return new Promise((resolve, reject) => {
    const secure = tls.connect({ socket, servername: host }, () => resolve(secure))
    secure.once('error', reject)
  })
}

async function smtpTransaction(
  initial: SocketLike,
  host: string,
  opts: {
    port: number
    user?: string
    pass?: string
    from: string
    to: string
    subject: string
    text: string
  }
): Promise<string> {
  let socket = initial
  let buffer = ''

  const readLine = (): Promise<string> =>
    new Promise((resolve, reject) => {
      const tryConsume = () => {
        const idx = buffer.indexOf('\n')
        if (idx >= 0) {
          const line = buffer.slice(0, idx + 1)
          buffer = buffer.slice(idx + 1)
          resolve(line)
          return true
        }
        return false
      }
      if (tryConsume()) return
      const onData = (chunk: Buffer) => {
        buffer += chunk.toString('utf8')
        if (tryConsume()) {
          socket.off('data', onData)
          socket.off('error', onErr)
        }
      }
      const onErr = (err: Error) => {
        socket.off('data', onData)
        reject(err)
      }
      socket.on('data', onData)
      socket.once('error', onErr)
    })

  const readResponse = async () => {
    let line = await readLine()
    let full = line
    while (/^\d{3}-/.test(line)) {
      line = await readLine()
      full += line
    }
    return full
  }

  const send = async (cmd: string) => {
    socket.write(cmd.endsWith('\r\n') ? cmd : `${cmd}\r\n`)
    return readResponse()
  }

  await readResponse()
  await send(`EHLO librastack.local`)

  if (opts.port === 587) {
    const start = await send('STARTTLS')
    if (!start.startsWith('220')) throw new Error(`STARTTLS failed: ${start.trim()}`)
    socket.removeAllListeners('data')
    socket = await upgradeToTls(socket, host)
    buffer = ''
    await send(`EHLO librastack.local`)
  }

  if (opts.user && opts.pass) {
    await send('AUTH LOGIN')
    await send(Buffer.from(opts.user).toString('base64'))
    const authRes = await send(Buffer.from(opts.pass).toString('base64'))
    if (!authRes.startsWith('235')) throw new Error(`AUTH failed: ${authRes.trim()}`)
  }

  await send(`MAIL FROM:<${opts.from}>`)
  await send(`RCPT TO:<${opts.to}>`)
  await send('DATA')
  const messageId = `<${Date.now()}.${Math.random().toString(36).slice(2)}@librastack.local>`
  const dataRes = await send(
    [
      `From: ${opts.from}`,
      `To: ${opts.to}`,
      `Subject: ${opts.subject}`,
      `Message-ID: ${messageId}`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=utf-8',
      '',
      opts.text.replace(/\r?\n/g, '\r\n'),
      '.',
    ].join('\r\n')
  )
  if (!dataRes.startsWith('250')) throw new Error(`DATA failed: ${dataRes.trim()}`)
  await send('QUIT').catch(() => undefined)
  socket.end()
  return messageId
}

export default class EmailChannel {
  async send(input: SendNotificationInput): Promise<EmailSendResult> {
    const to = input.email
    if (!to) {
      return { success: false, error: 'No email address for recipient' }
    }

    if (emailJsMailerService.isConfigured()) {
      const result = await emailJsMailerService.send({
        toEmail: to,
        toName: input.recipientName,
        subject: input.title,
        message: input.body,
        extraParams: {
          event_type: input.eventType,
          channel: 'library',
        },
      })
      return {
        success: result.success,
        providerId: result.success ? 'emailjs' : undefined,
        error: result.error,
      }
    }

    const smtpHost = env.get('SMTP_HOST')
    if (!smtpHost) {
      logger.info(
        { channel: 'email', to, eventType: input.eventType },
        'Email skipped: EmailJS and SMTP not configured'
      )
      return { success: false, error: 'EmailJS and SMTP not configured' }
    }

    const port = env.get('SMTP_PORT') ?? 587
    const user = env.get('SMTP_USER')
    const pass = env.get('SMTP_PASSWORD')
    const from = env.get('MAIL_FROM') || user || 'library@localhost'

    try {
      const socket = await connectSocket(smtpHost, port, port === 465)
      const providerId = await smtpTransaction(socket, smtpHost, {
        port,
        user: user ?? undefined,
        pass: pass ?? undefined,
        from,
        to,
        subject: input.title,
        text: input.body,
      })
      return { success: true, providerId }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'SMTP send failed'
      logger.error({ err: error, to, eventType: input.eventType }, 'Email SMTP send failed')
      return { success: false, error: message }
    }
  }
}
