import { tenantContext } from '#modules/library/services/tenant/tenant_context'

export function buildSearchText(parts: {
  title: string
  authorNames?: string | null
  subjectNames?: string | null
  isbn13?: string | null
  isbn10?: string | null
  issn?: string | null
  categoryName?: string | null
  genre?: string | null
  publisherName?: string | null
  classificationNumber?: string | null
  materialType?: string | null
}): string {
  return [
    parts.title,
    parts.authorNames,
    parts.subjectNames,
    parts.isbn13,
    parts.isbn10,
    parts.issn,
    parts.categoryName,
    parts.genre,
    parts.publisherName,
    parts.classificationNumber,
    parts.materialType,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .trim()
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function normalizeAuthorityName(value: string): string {
  return value.toLowerCase().trim().replace(/\s+/g, ' ')
}

export function generateBarcode(tenantId: string, sequence: number): string {
  const prefix = tenantId.replace(/-/g, '').slice(0, 4).toUpperCase()
  return `BK-${prefix}-${String(sequence).padStart(6, '0')}`
}

export function tenantId(): string {
  return tenantContext.get().id
}

export function buildDublinCore(parts: {
  title: string
  authorNames?: string | null
  subjectNames?: string | null
  publisherName?: string | null
  isbn13?: string | null
  isbn10?: string | null
  issn?: string | null
  publicationYear?: number | null
  description?: string | null
  materialType?: string | null
}): Record<string, unknown> {
  return {
    title: parts.title,
    creator: parts.authorNames ?? undefined,
    subject: parts.subjectNames ?? undefined,
    publisher: parts.publisherName ?? undefined,
    identifier: parts.isbn13 ?? parts.isbn10 ?? parts.issn ?? undefined,
    date: parts.publicationYear ? String(parts.publicationYear) : undefined,
    description: parts.description ?? undefined,
    type: parts.materialType ?? undefined,
  }
}
