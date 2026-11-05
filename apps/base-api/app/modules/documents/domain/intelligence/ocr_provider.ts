import type { OcrResult } from '#modules/documents/domain/intelligence/intelligence_types'

export interface OcrExtractInput {
  bucket: string
  key: string
  mimeType: string
  fileBuffer?: Buffer
}

export interface OcrProvider {
  readonly name: string
  isConfigured(): boolean
  extractText(input: OcrExtractInput): Promise<OcrResult>
}
