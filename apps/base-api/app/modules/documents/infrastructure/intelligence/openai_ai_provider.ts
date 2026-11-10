import logger from '@adonisjs/core/services/logger'
import env from '#start/env'
import type { AiAnalysisInput, AiProvider } from '#modules/documents/domain/intelligence/ai_provider'
import {
  SupportedDocumentCategory,
  type AiAnalysisContext,
  type ClassificationResult,
  type MetadataExtractionResult,
  type RoutingSuggestionResult,
  type SummaryResult,
} from '#modules/documents/domain/intelligence/intelligence_types'

const SUPPORTED_CATEGORIES = [
  SupportedDocumentCategory.INVOICE,
  SupportedDocumentCategory.CONTRACT,
  SupportedDocumentCategory.PERMIT,
  SupportedDocumentCategory.PURCHASE_REQUEST,
]

export class OpenAiProvider implements AiProvider {
  readonly name = 'openai'

  isConfigured(): boolean {
    return Boolean(env.get('OPENAI_API_KEY'))
  }

  async classify(input: AiAnalysisInput): Promise<ClassificationResult> {
    const result = await this.chatJson<{ category: string; confidence: number; alternatives: Array<{ category: string; confidence: number }> }>(
      `Classify this document into one of: ${SUPPORTED_CATEGORIES.join(', ')}.`,
      input.text.slice(0, 12000)
    )

    return {
      category: this.normalizeCategory(result.category),
      confidence: result.confidence,
      alternatives: (result.alternatives ?? []).map((entry) => ({
        category: this.normalizeCategory(entry.category),
        confidence: entry.confidence,
      })),
    }
  }

  async extractMetadata(
    input: AiAnalysisInput,
    category: SupportedDocumentCategory
  ): Promise<MetadataExtractionResult> {
    const result = await this.chatJson<{ fields: Record<string, string | number | null> }>(
      `Extract structured metadata fields for a ${category} document. Return JSON { "fields": { ... } }.`,
      input.text.slice(0, 12000)
    )

    return {
      category,
      fields: result.fields ?? {},
    }
  }

  async suggestRouting(
    input: AiAnalysisInput,
    category: SupportedDocumentCategory,
    context: AiAnalysisContext
  ): Promise<RoutingSuggestionResult> {
    const departments = context.departments.map((entry) => `${entry.code}: ${entry.name}`).join(', ')
    const result = await this.chatJson<RoutingSuggestionResult>(
      `Suggest routing for a ${category} document. Available departments: ${departments}. Return JSON with suggestedDepartmentCode, suggestedDepartmentName, suggestedAssigneeRole, reason, confidence.`,
      input.text.slice(0, 8000)
    )

    return result
  }

  async summarize(
    input: AiAnalysisInput,
    category: SupportedDocumentCategory
  ): Promise<SummaryResult> {
    const result = await this.chatJson<SummaryResult>(
      `Summarize this ${category} document for an internal workflow system. Return JSON { "summary": string, "keyPoints": string[] }.`,
      input.text.slice(0, 12000)
    )

    return {
      summary: result.summary,
      keyPoints: result.keyPoints ?? [],
    }
  }

  private normalizeCategory(value: string): SupportedDocumentCategory {
    const normalized = value.toLowerCase().replace(/\s+/g, '_')
    if (normalized.includes('purchase')) return SupportedDocumentCategory.PURCHASE_REQUEST
    if (SUPPORTED_CATEGORIES.includes(normalized as SupportedDocumentCategory)) {
      return normalized as SupportedDocumentCategory
    }
    return SupportedDocumentCategory.UNKNOWN
  }

  private async chatJson<T>(systemPrompt: string, userContent: string): Promise<T> {
    const apiKey = env.get('OPENAI_API_KEY')
    if (!apiKey) {
      throw new Error('OpenAI API key is not configured')
    }

    const baseUrl = (env.get('OPENAI_BASE_URL') ?? 'https://api.openai.com/v1').replace(/\/$/, '')
    const model = env.get('OPENAI_MODEL') ?? 'gpt-4o-mini'

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: `${systemPrompt} Respond with valid JSON only.` },
          { role: 'user', content: userContent },
        ],
        temperature: 0.2,
      }),
    })

    if (!response.ok) {
      const body = await response.text()
      logger.error({ status: response.status, body }, '[OpenAI] request failed')
      throw new Error('OpenAI request failed')
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }

    const content = payload.choices?.[0]?.message?.content
    if (!content) {
      throw new Error('OpenAI returned an empty response')
    }

    return JSON.parse(content) as T
  }
}

export const openAiProvider = new OpenAiProvider()
