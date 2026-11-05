export enum IntelligenceJobStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum IntelligenceTask {
  OCR = 'ocr',
  CLASSIFY = 'classify',
  EXTRACT_METADATA = 'extract_metadata',
  ROUTING_SUGGESTION = 'routing_suggestion',
  SUMMARIZE = 'summarize',
}

export enum SupportedDocumentCategory {
  INVOICE = 'invoice',
  CONTRACT = 'contract',
  PERMIT = 'permit',
  PURCHASE_REQUEST = 'purchase_request',
  UNKNOWN = 'unknown',
}

export const DEFAULT_INTELLIGENCE_TASKS: IntelligenceTask[] = [
  IntelligenceTask.OCR,
  IntelligenceTask.CLASSIFY,
  IntelligenceTask.EXTRACT_METADATA,
  IntelligenceTask.ROUTING_SUGGESTION,
  IntelligenceTask.SUMMARIZE,
]

export interface IntelligenceJobPayload {
  jobId: string
  tenantId: string
  documentId: string
  fileId: string
  tasks: IntelligenceTask[]
}

export interface OcrResult {
  text: string
  provider: string
  confidence?: number
}

export interface ClassificationResult {
  category: SupportedDocumentCategory
  confidence: number
  alternatives: Array<{ category: SupportedDocumentCategory; confidence: number }>
}

export interface MetadataExtractionResult {
  category: SupportedDocumentCategory
  fields: Record<string, string | number | null>
}

export interface RoutingSuggestionResult {
  suggestedDepartmentCode: string | null
  suggestedDepartmentName: string | null
  suggestedAssigneeRole: string | null
  reason: string
  confidence: number
}

export interface SummaryResult {
  summary: string
  keyPoints: string[]
}

export interface IntelligenceAnalysisResult {
  ocr?: OcrResult
  classification?: ClassificationResult
  metadata?: MetadataExtractionResult
  routingSuggestion?: RoutingSuggestionResult
  summary?: SummaryResult
  processedAt: string
}

export interface AiAnalysisContext {
  departments: Array<{ code: string; name: string }>
}
