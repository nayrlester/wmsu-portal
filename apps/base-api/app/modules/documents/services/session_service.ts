import { DateTime } from 'luxon'
import UserSession from '#modules/documents/models/user_session'
import RefreshToken from '#modules/documents/models/refresh_token'
import User from '#modules/documents/models/user'

export interface SessionMeta {
  ip?: string
  userAgent?: string
  deviceLabel?: string
}

export class SessionService {
  async createSession(
    user: User,
    refreshTokenId: string,
    expiresAt: DateTime,
    meta?: SessionMeta
  ): Promise<UserSession> {
    return UserSession.create({
      userId: user.id,
      refreshTokenId,
      ipAddress: meta?.ip ?? null,
      userAgent: meta?.userAgent ?? null,
      deviceLabel: meta?.deviceLabel ?? this.parseDeviceLabel(meta?.userAgent),
      lastActiveAt: DateTime.now(),
      expiresAt,
    })
  }

  async listActiveSessions(userId: string): Promise<UserSession[]> {
    return UserSession.query()
      .where('user_id', userId)
      .whereNull('revoked_at')
      .where('expires_at', '>', DateTime.now().toSQL())
      .orderBy('last_active_at', 'desc')
  }

  async touchSession(refreshTokenId: string): Promise<void> {
    await UserSession.query()
      .where('refresh_token_id', refreshTokenId)
      .whereNull('revoked_at')
      .update({ last_active_at: DateTime.now().toSQL() })

    await RefreshToken.query()
      .where('id', refreshTokenId)
      .update({ last_active_at: DateTime.now().toSQL() })
  }

  async revokeSession(sessionId: string, userId: string): Promise<void> {
    const session = await UserSession.query()
      .where('id', sessionId)
      .where('user_id', userId)
      .whereNull('revoked_at')
      .firstOrFail()

    session.revokedAt = DateTime.now()
    await session.save()

    if (session.refreshTokenId) {
      await RefreshToken.query()
        .where('id', session.refreshTokenId)
        .update({ revoked_at: DateTime.now().toSQL() })
    }
  }

  async revokeAllSessions(userId: string, exceptSessionId?: string): Promise<number> {
    const query = UserSession.query()
      .where('user_id', userId)
      .whereNull('revoked_at')

    if (exceptSessionId) {
      query.whereNot('id', exceptSessionId)
    }

    const sessions = await query
    const now = DateTime.now().toSQL()

    for (const session of sessions) {
      session.revokedAt = DateTime.now()
      await session.save()

      if (session.refreshTokenId) {
        await RefreshToken.query()
          .where('id', session.refreshTokenId)
          .update({ revoked_at: now })
      }
    }

    return sessions.length
  }

  private parseDeviceLabel(userAgent?: string): string | null {
    if (!userAgent) return null
    if (userAgent.includes('Mobile')) return 'Mobile Device'
    if (userAgent.includes('Windows')) return 'Windows'
    if (userAgent.includes('Mac')) return 'macOS'
    if (userAgent.includes('Linux')) return 'Linux'
    return 'Unknown Device'
  }
}

export const sessionService = new SessionService()
