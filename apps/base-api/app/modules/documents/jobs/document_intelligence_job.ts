import type { IntelligenceJobPayload } from '#modules/documents/domain/intelligence/intelligence_types'
import { documentIntelligenceService } from '#modules/documents/services/document_intelligence_service'

export async function processDocumentIntelligence(payload: IntelligenceJobPayload): Promise<void> {
  await documentIntelligenceService.processJob(payload)
}
