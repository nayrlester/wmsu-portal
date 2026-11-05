import { DateTime } from 'luxon'
import hash from '@adonisjs/core/services/hash'
import User from '#modules/documents/models/user'
import PasswordResetToken from '#modules/documents/models/password_reset_token'
import RefreshToken from '#modules/documents/models/refresh_token'
import { tokenService } from '#modules/documents/services/token_service'
import { mailService } from '#modules/documents/services/mail_service'
import { auditService } from '#modules/documents/services/audit_service'
import { AuditAction } from '#modules/documents/domain/enums/index'

export class PasswordResetService {
  async requestReset(email: string): Promise<void> {
    const user = await User.query()
      .where('email', email.toLowerCase())
      .whereNull('deleted_at')
      .where('status', 'active')
      .first()

    if (!user) {
      return
    }

    await PasswordResetToken.query()
      .where('user_id', user.id)
      .whereNull('used_at')
      .delete()

    const rawToken = tokenService.generate()
    await PasswordResetToken.create({
      userId: user.id,
      tokenHash: tokenService.hash(rawToken),
      expiresAt: DateTime.now().plus({ hours: 1 }),
    })

    await mailService.sendPasswordResetEmail(user.email, user.fullName, rawToken)

    await auditService.log({
      tenantId: user.tenantId,
      userId: user.id,
      action: AuditAction.UPDATE,
      entityType: 'user',
      entityId: user.id,
      metadata: { action: 'password_reset_requested' },
    })
  }

  async resetPassword(rawToken: string, newPassword: string): Promise<User> {
    const tokenHash = tokenService.hash(rawToken)
    const record = await PasswordResetToken.query()
      .where('token_hash', tokenHash)
      .whereNull('used_at')
      .where('expires_at', '>', DateTime.now().toSQL())
      .preload('user')
      .firstOrFail()

    record.usedAt = DateTime.now()
    await record.save()

    const user = record.user
    user.password = newPassword
    await user.save()

    await RefreshToken.query()
      .where('user_id', user.id)
      .whereNull('revoked_at')
      .update({ revoked_at: DateTime.now().toSQL() })

    await auditService.log({
      tenantId: user.tenantId,
      userId: user.id,
      action: AuditAction.UPDATE,
      entityType: 'user',
      entityId: user.id,
      metadata: { action: 'password_reset_completed' },
    })

    return user
  }

  async validateToken(rawToken: string): Promise<boolean> {
    const tokenHash = tokenService.hash(rawToken)
    const record = await PasswordResetToken.query()
      .where('token_hash', tokenHash)
      .whereNull('used_at')
      .where('expires_at', '>', DateTime.now().toSQL())
      .first()

    return record !== null
  }
}

export const passwordResetService = new PasswordResetService()
