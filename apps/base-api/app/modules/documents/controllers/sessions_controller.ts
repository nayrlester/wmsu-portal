import type { HttpContext } from '@adonisjs/core/http'
import { sessionService } from '#modules/documents/services/session_service'

export default class SessionsController {
  async index({ auth, response }: HttpContext) {
    const sessions = await sessionService.listActiveSessions(auth.user!.id)

    return response.ok({
      sessions: sessions.map((s) => ({
        id: s.id,
        deviceLabel: s.deviceLabel,
        ipAddress: s.ipAddress,
        userAgent: s.userAgent,
        lastActiveAt: s.lastActiveAt,
        expiresAt: s.expiresAt,
        createdAt: s.createdAt,
      })),
    })
  }

  async destroy({ auth, params, response }: HttpContext) {
    await sessionService.revokeSession(params.id, auth.user!.id)
    return response.ok({ message: 'Session revoked' })
  }

  async destroyAll({ auth, request, response }: HttpContext) {
    const exceptSessionId = request.input('exceptSessionId')
    const count = await sessionService.revokeAllSessions(auth.user!.id, exceptSessionId)

    return response.ok({ message: `${count} session(s) revoked` })
  }
}
