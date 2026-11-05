import vine from '@vinejs/vine'
import { IntelligenceTask } from '#modules/documents/domain/intelligence/intelligence_types'

export const analyzeDocumentIntelligenceValidator = vine.compile(
  vine.object({
    fileId: vine.string().uuid(),
    tasks: vine
      .array(
        vine.enum([
          IntelligenceTask.OCR,
          IntelligenceTask.CLASSIFY,
          IntelligenceTask.EXTRACT_METADATA,
          IntelligenceTask.ROUTING_SUGGESTION,
          IntelligenceTask.SUMMARIZE,
        ])
      )
      .optional(),
  })
)

export const correctIntelligenceMetadataValidator = vine.compile(
  vine.object({
    fields: vine.record(vine.any()),
    searchText: vine.string().trim().maxLength(20000).optional(),
  })
)
