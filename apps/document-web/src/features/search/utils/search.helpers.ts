import type {
  SearchDocumentHit,
  SearchFileHit,
  SearchFilterTab,
  SearchResultType,
  SearchUserHit,
  SearchWorkflowHit,
  UniversalSearchResult,
} from '@/features/search/types/search.types'

export type FlatSearchHit =
  | { type: 'document'; item: SearchDocumentHit }
  | { type: 'file'; item: SearchFileHit }
  | { type: 'user'; item: SearchUserHit }
  | { type: 'workflow'; item: SearchWorkflowHit }

export function buildFileSearchPath(
  documentId: string,
  fileId: string,
  keywords?: string
): string {
  const params = new URLSearchParams({ tab: 'details', fileId })
  if (keywords?.trim()) params.set('q', keywords.trim())
  return `/app/documents/${documentId}?${params.toString()}`
}

export function getHitPath(hit: FlatSearchHit, query?: string): string {
  switch (hit.type) {
    case 'document':
      return query?.trim()
        ? `/app/documents/${hit.item.id}?tab=details&q=${encodeURIComponent(query.trim())}`
        : `/app/documents/${hit.item.id}?tab=details`
    case 'file':
      return buildFileSearchPath(hit.item.documentId, hit.item.id, query)
    case 'user':
      return `/app/team`
    case 'workflow':
      return `/app/workflows`
  }
}

export function highlightParts(text: string, query: string): Array<{ text: string; highlight: boolean }> {
  const keywords = query
    .split(/\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 2)

  if (!keywords.length || !text) {
    return [{ text, highlight: false }]
  }

  const pattern = new RegExp(
    `(${keywords.map((keyword) => keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`,
    'gi'
  )

  return text.split(pattern).filter(Boolean).map((part) => ({
    text: part,
    highlight: keywords.some((keyword) => part.toLowerCase() === keyword.toLowerCase()),
  }))
}

export const SEARCH_FILTER_TABS: Array<{ id: SearchFilterTab; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'keywords', label: 'Keywords' },
  { id: 'document', label: 'Documents' },
  { id: 'user', label: 'People' },
]

const KEYWORD_SEARCH_TYPES: SearchResultType[] = ['document', 'file']

export function normalizeSearchFilterTab(tab: string | null | undefined): SearchFilterTab {
  if (tab === 'keywords' || tab === 'document' || tab === 'user') return tab
  return 'all'
}

export function filterSearchResults(
  results: UniversalSearchResult,
  tab: SearchFilterTab
): FlatSearchHit[] {
  const hits: FlatSearchHit[] = []

  if (tab === 'all' || tab === 'keywords' || tab === 'document') {
    hits.push(...results.documents.map((item) => ({ type: 'document' as const, item })))
  }
  if (tab === 'all' || tab === 'keywords') {
    hits.push(...results.files.map((item) => ({ type: 'file' as const, item })))
  }
  if (tab === 'all' || tab === 'user') {
    hits.push(...results.users.map((item) => ({ type: 'user' as const, item })))
  }

  return hits
}

export function tabToApiTypes(tab: SearchFilterTab): SearchResultType[] | undefined {
  switch (tab) {
    case 'all':
      return undefined
    case 'keywords':
      return KEYWORD_SEARCH_TYPES
    default:
      return [tab]
  }
}

export function getHitLabel(hit: FlatSearchHit): string {
  switch (hit.type) {
    case 'document':
      return hit.item.title
    case 'file':
      return hit.item.originalName
    case 'user':
      return hit.item.fullName ?? hit.item.email
    case 'workflow':
      return hit.item.name
  }
}

export function getHitSubtitle(hit: FlatSearchHit): string | null {
  switch (hit.type) {
    case 'document':
      return hit.item.trackingNumber
    case 'file':
      return `${hit.item.documentTitle} · ${hit.item.trackingNumber}`
    case 'user':
      return hit.item.email
    case 'workflow':
      return hit.item.status
  }
}

export function getHitSnippet(hit: FlatSearchHit): string | null {
  return hit.item.snippet
}
