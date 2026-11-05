import logger from '@adonisjs/core/services/logger'
import env from '#start/env'
import { pushTokenRepository } from '#infrastructure/repositories/push_token_repository'

export class PushNotificationService {
  private initialized = false
  private messaging: import('firebase-admin/messaging').Messaging | null = null

  private async getMessaging() {
    if (this.messaging) return this.messaging

    const projectId = env.get('FIREBASE_PROJECT_ID')
    const clientEmail = env.get('FIREBASE_CLIENT_EMAIL')
    const privateKey = env.get('FIREBASE_PRIVATE_KEY')

    if (!projectId || !clientEmail || !privateKey) {
      return null
    }

    const { default: admin } = await import('firebase-admin')

    if (!this.initialized) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey: privateKey.replace(/\\n/g, '\n'),
        }),
      })
      this.initialized = true
    }

    this.messaging = admin.messaging()
    return this.messaging
  }

  async sendToUser(
    userId: string,
    payload: { title: string; body: string | null; data?: Record<string, string> },
    tenantId?: string
  ): Promise<void> {
    const messaging = await this.getMessaging()
    const tokens = await pushTokenRepository.listForUser(userId, tenantId)

    if (!messaging || tokens.length === 0) {
      logger.info({ userId, title: payload.title }, '[PushNotificationService] push skipped (not configured or no tokens)')
      return
    }

    await messaging.sendEachForMulticast({
      tokens: tokens.map((entry) => entry.token),
      notification: {
        title: payload.title,
        body: payload.body ?? undefined,
      },
      data: payload.data ?? {},
    })
  }
}

export const pushNotificationService = new PushNotificationService()
