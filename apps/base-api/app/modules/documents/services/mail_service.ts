import logger from '@adonisjs/core/services/logger'
import env from '#start/env'

export interface MailPayload {
  to: string
  subject: string
  html: string
  text?: string
}

export class MailService {
  async send(payload: MailPayload): Promise<void> {
    const smtpHost = env.get('SMTP_HOST')

    if (!smtpHost) {
      logger.info(
        { to: payload.to, subject: payload.subject },
        '[MailService] SMTP not configured — email logged to console'
      )
      return
    }

    const { default: mail } = await import('@adonisjs/mail/services/main')
    await mail.send((message) => {
      message
        .to(payload.to)
        .from(env.get('MAIL_FROM') ?? 'noreply@cdts.io')
        .subject(payload.subject)
        .html(payload.html)
      if (payload.text) {
        message.text(payload.text)
      }
    })
  }

  async sendVerificationEmail(email: string, fullName: string | null, token: string): Promise<void> {
    const verifyUrl = `${env.get('APP_URL')}/api/v1/auth/verify-email?token=${token}`
    const name = fullName ?? email

    await this.send({
      to: email,
      subject: 'Verify your CDTS account',
      html: `
        <h2>Welcome to CDTS, ${name}!</h2>
        <p>Please verify your email address by clicking the link below:</p>
        <p><a href="${verifyUrl}">Verify Email</a></p>
        <p>This link expires in 24 hours.</p>
        <p>If you did not create an account, ignore this email.</p>
      `,
      text: `Verify your email: ${verifyUrl}`,
    })
  }

  async sendPasswordResetEmail(email: string, fullName: string | null, token: string): Promise<void> {
    const frontendUrl = env.get('FRONTEND_URL')
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`
    const name = fullName ?? email

    await this.send({
      to: email,
      subject: 'Reset your CDTS password',
      html: `
        <h2>Password Reset Request</h2>
        <p>Hi ${name},</p>
        <p>We received a request to reset your password. Click the link below:</p>
        <p><a href="${resetUrl}">Reset Password</a></p>
        <p>This link expires in 1 hour. If you did not request this, ignore this email.</p>
      `,
      text: `Reset your password: ${resetUrl}`,
    })
  }
}

export const mailService = new MailService()
