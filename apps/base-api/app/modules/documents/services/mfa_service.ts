import { DateTime } from 'luxon'
import { randomBytes } from 'node:crypto'
import env from '#start/env'
import User from '#modules/documents/models/user'
import { tokenService } from '#modules/documents/services/token_service'
import { auditService } from '#modules/documents/services/audit_service'
import { AuditAction } from '#modules/documents/domain/enums/index'

export interface MfaSetupResult {
  secret: string
  qrCodeDataUrl: string
  otpauthUrl: string
}

export class MfaService {
  async setup(user: User): Promise<MfaSetupResult> {
    const secret = randomBytes(20).toString('hex').toUpperCase()
    user.mfaSecret = secret
    user.mfaEnabled = false
    await user.save()

    const appName = env.get('APP_NAME') ?? 'UDMS'
    const otpauthUrl = `otpauth://totp/${encodeURIComponent(appName)}:${encodeURIComponent(user.email)}?secret=${secret}&issuer=${encodeURIComponent(appName)}`
    return { secret, qrCodeDataUrl: '', otpauthUrl }
  }

  async enable(user: User, code: string): Promise<void> {
    if (!user.mfaSecret) {
      throw new Error('MFA setup not initiated')
    }
    if (!(await this.verifyCode(user, code))) {
      throw new Error('Invalid MFA code')
    }
    user.mfaEnabled = true
    await user.save()
    await auditService.log({
      tenantId: user.tenantId,
      userId: user.id,
      action: AuditAction.UPDATE,
      entityType: 'user',
      entityId: user.id,
      metadata: { action: 'mfa_enabled' },
    })
  }

  async disable(user: User, code: string): Promise<void> {
    if (!user.mfaEnabled || !user.mfaSecret) {
      throw new Error('MFA is not enabled')
    }
    if (!(await this.verifyCode(user, code))) {
      throw new Error('Invalid MFA code')
    }
    user.mfaEnabled = false
    user.mfaSecret = null
    await user.save()
    await auditService.log({
      tenantId: user.tenantId,
      userId: user.id,
      action: AuditAction.UPDATE,
      entityType: 'user',
      entityId: user.id,
      metadata: { action: 'mfa_disabled' },
    })
  }

  async verifyCode(_user: User, _code: string): Promise<boolean> {
    return false
  }

  createMfaChallengeToken(userId: string): string {
    const payload = `${userId}:${DateTime.now().toMillis()}:${tokenService.generate(16)}`
    return Buffer.from(payload).toString('base64url')
  }

  parseMfaChallengeToken(token: string): string | null {
    try {
      const decoded = Buffer.from(token, 'base64url').toString('utf-8')
      const [userId, timestamp] = decoded.split(':')
      if (!userId || !timestamp) return null
      const age = DateTime.now().toMillis() - Number(timestamp)
      if (age > 5 * 60 * 1000) return null
      return userId
    } catch {
      return null
    }
  }
}

export const mfaService = new MfaService()
