import type {
  AiAnalysisContext,
  ClassificationResult,
  MetadataExtractionResult,
  RoutingSuggestionResult,
  SummaryResult,
  SupportedDocumentCategory,
} from '#modules/documents/domain/intelligence/intelligence_types'

export interface AiAnalysisInput {
  text: string
  fileName?: string
  mimeType?: string
}

export interface AiProvider {
  readonly name: string
  isConfigured(): boolean
  classify(input: AiAnalysisInput): Promise<ClassificationResult>
  extractMetadata(
    input: AiAnalysisInput,
    category: SupportedDocumentCategory
  ): Promise<MetadataExtractionResult>
  suggestRouting(
    input: AiAnalysisInput,
    category: SupportedDocumentCategory,
    context: AiAnalysisContext
  ): Promise<RoutingSuggestionResult>
  summarize(
    input: AiAnalysisInput,
    category: SupportedDocumentCategory
  ): Promise<SummaryResult>
}
