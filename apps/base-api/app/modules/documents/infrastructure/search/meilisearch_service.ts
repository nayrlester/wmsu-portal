import env from '#start/env'
import logger from '@adonisjs/core/services/logger'
import Document from '#modules/documents/models/document'
import type { SearchDocumentHit } from '#modules/documents/domain/search/search_types'
import { DocumentStatus } from '#modules/documents/domain/enums/index'
import { searchRepository } from '#infrastructure/repositories/search_repository'

export interface MeilisearchSearchOptions {
  term: string
  limit: number
  tenantId: string
}

/**
 * Optional Meilisearch integration (Phase 3). Falls back to PostgreSQL when disabled.
 */
export class MeilisearchService {
  isEnabled(): boolean {
    return Boolean(env.get('MEILISEARCH_HOST') && env.get('MEILISEARCH_API_KEY'))
  }

  async searchDocuments(options: MeilisearchSearchOptions): Promise<SearchDocumentHit[] | null> {
    if (!this.isEnabled()) return null

    const host = env.get('MEILISEARCH_HOST')!
    const apiKey = env.get('MEILISEARCH_API_KEY')!
    const index = `documents_${options.tenantId}`

    try {
      const response = await fetch(`${host}/indexes/${index}/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          q: options.term,
          limit: options.limit,
        }),
      })

      if (!response.ok) {
        logger.warn({ status: response.status }, '[Meilisearch] search failed — using PostgreSQL fallback')
        return null
      }

      const payload = (await response.json()) as {
        hits?: Array<{
          id: string
          title: string
          trackingNumber: string
          status: string
          _formatted?: { title?: string }
        }>
      }

      return (payload.hits ?? []).map((hit) => ({
        id: hit.id,
        title: hit.title,
        trackingNumber: hit.trackingNumber,
        status: hit.status,
        snippet: hit._formatted?.title ?? hit.title,
        matchField: 'title' as const,
      }))
    } catch (error) {
      logger.warn({ error }, '[Meilisearch] unavailable — using PostgreSQL fallback')
      return null
    }
  }

  async syncDocument(tenantId: string, document: SearchDocumentHit): Promise<void> {
    if (!this.isEnabled()) return
    const host = env.get('MEILISEARCH_HOST')!
    const apiKey = env.get('MEILISEARCH_API_KEY')!
    const index = `documents_${tenantId}`

    await fetch(`${host}/indexes/${index}/documents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify([document]),
    }).catch(() => undefined)
  }
}

export const meilisearchService = new MeilisearchService()

export async function searchDocumentsWithFallback(
  tenantId: string,
  term: string,
  limit: number,
  viewerUserId?: string
): Promise<SearchDocumentHit[]> {
  const meili = await meilisearchService.searchDocuments({ tenantId, term, limit })
  const hits = meili ?? (await searchRepository.searchDocuments(term, limit, viewerUserId))

  if (!viewerUserId || !meili) {
    return hits
  }

  return filterDraftSearchHits(hits, viewerUserId)
}

async function filterDraftSearchHits(
  hits: SearchDocumentHit[],
  viewerUserId: string
): Promise<SearchDocumentHit[]> {
  const draftIds = hits.filter((hit) => hit.status === DocumentStatus.DRAFT).map((hit) => hit.id)
  if (draftIds.length === 0) return hits

  const allowedDrafts = await Document.query()
    .whereIn('id', draftIds)
    .where((q) => {
      q.where('created_by_id', viewerUserId)
        .orWhereNotNull('ocr_qa_status')
        .orWhereNotNull('physical_box_id')
    })
    .select('id')

  const allowedIds = new Set(allowedDrafts.map((row) => row.id))
  return hits.filter((hit) => hit.status !== DocumentStatus.DRAFT || allowedIds.has(hit.id))
}
