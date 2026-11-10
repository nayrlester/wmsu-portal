import env from '#start/env'
import { stubOcrProvider } from '#infrastructure/intelligence/stub_ocr_provider'
import { textractOcrProvider } from '#infrastructure/intelligence/textract_ocr_provider'
import { stubAiProvider } from '#infrastructure/intelligence/stub_ai_provider'
import { openAiProvider } from '#infrastructure/intelligence/openai_ai_provider'
import type { OcrProvider } from '#modules/documents/domain/intelligence/ocr_provider'
import type { AiProvider } from '#modules/documents/domain/intelligence/ai_provider'

export function getOcrProvider(): OcrProvider {
  const configured = env.get('OCR_PROVIDER')

  if (configured === 'stub') return stubOcrProvider
  if (configured === 'textract') return textractOcrProvider
  if (textractOcrProvider.isConfigured()) return textractOcrProvider

  return stubOcrProvider
}

export function getAiProvider(): AiProvider {
  const configured = env.get('AI_PROVIDER')

  if (configured === 'stub') return stubAiProvider
  if (configured === 'openai') return openAiProvider
  if (openAiProvider.isConfigured()) return openAiProvider

  return stubAiProvider
}
