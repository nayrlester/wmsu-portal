import { DateTime } from 'luxon'
import User from '#modules/documents/models/user'
import EmailVerificationToken from '#modules/documents/models/email_verification_token'
import { tokenService } from '#modules/documents/services/token_service'
import { mailService } from '#modules/documents/services/mail_service'
import { auditService } from '#modules/documents/services/audit_service'
import { AuditAction } from '#modules/documents/domain/enums/index'

export class EmailVerificationService {
  async sendVerification(user: User): Promise<void> {
    await EmailVerificationToken.query()
      .where('user_id', user.id)
      .whereNull('used_at')
      .delete()

    const rawToken = tokenService.generate()
    await EmailVerificationToken.create({
      userId: user.id,
      tokenHash: tokenService.hash(rawToken),
      expiresAt: DateTime.now().plus({ hours: 24 }),
    })

    await mailService.sendVerificationEmail(user.email, user.fullName, rawToken)
  }

  async verify(rawToken: string): Promise<User> {
    const tokenHash = tokenService.hash(rawToken)
    const record = await EmailVerificationToken.query()
      .where('token_hash', tokenHash)
      .whereNull('used_at')
      .where('expires_at', '>', DateTime.now().toSQL())
      .preload('user')
      .firstOrFail()

    record.usedAt = DateTime.now()
    await record.save()

    const user = record.user
    user.emailVerified = true
    user.emailVerifiedAt = DateTime.now()
    await user.save()

    await auditService.log({
      tenantId: user.tenantId,
      userId: user.id,
      action: AuditAction.UPDATE,
      entityType: 'user',
      entityId: user.id,
      newValues: { emailVerified: true },
    })

    return user
  }

  async resend(email: string): Promise<void> {
    const user = await User.query().where('email', email.toLowerCase()).whereNull('deleted_at').first()

    if (!user || user.emailVerified) {
      return
    }

    await this.sendVerification(user)
  }
}

export const emailVerificationService = new EmailVerificationService()
