import { createHash } from 'node:crypto'
import type { DocumentListFilters } from '#modules/documents/domain/documents/document_dto'

export const DOCUMENT_FTS_VECTOR = `to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(tracking_number, '') || ' ' || coalesce(ai_summary, '') || ' ' || coalesce(content_html, ''))`

export function hashSearchQuery(term: string): string {
  return createHash('sha256').update(term.trim().toLowerCase()).digest('hex').slice(0, 16)
}

export function encodeDocumentCursor(createdAt: string, id: string): string {
  return Buffer.from(`${createdAt}|${id}`).toString('base64url')
}

export function decodeDocumentCursor(cursor: string): { createdAt: string; id: string } | null {
  try {
    const decoded = Buffer.from(cursor, 'base64url').toString('utf8')
    const separator = decoded.lastIndexOf('|')
    if (separator <= 0) return null
    return {
      createdAt: decoded.slice(0, separator),
      id: decoded.slice(separator + 1),
    }
  } catch {
    return null
  }
}

export function normalizeListLimit(limit?: number): number {
  return Math.min(Math.max(limit ?? 25, 1), 100)
}

export function normalizeListPage(page?: number): number {
  return Math.max(page ?? 1, 1)
}

export type { DocumentListFilters }
