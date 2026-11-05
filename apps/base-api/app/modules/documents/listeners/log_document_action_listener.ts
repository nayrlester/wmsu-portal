import logger from '@adonisjs/core/services/logger'
import type { DocumentActionEventPayload } from '#modules/documents/domain/routing/routing_types'

export default class LogDocumentActionListener {
  async handle(payload: DocumentActionEventPayload): Promise<void> {
    logger.info(
      {
        documentId: payload.documentId,
        action: payload.action,
        actorUserId: payload.actorUserId,
        toUserId: payload.toUserId,
      },
      '[DocumentAction] routing/approval event received'
    )
  }
}
