export type SearchEntityType = 'book' | 'member' | 'transaction'

export type SearchPreset = 'available' | 'overdue' | 'most_borrowed' | 'new_arrivals'

export interface SearchResultItem {
  id: string
  entityType: SearchEntityType
  entityId: string
  label: string
  subtitle: string | null
  metadata: Record<string, unknown>
  rank: number
  url: string
}

export interface SearchFacetCount {
  value: string
  count: number
}

export interface SearchCategoryFacet {
  id: string
  name: string
  count: number
}

export interface SearchFacets {
  entityTypes: SearchFacetCount[]
  genres: SearchFacetCount[]
  categories: SearchCategoryFacet[]
  memberTypes: SearchFacetCount[]
  borrowingStatuses: SearchFacetCount[]
}

export interface SearchParams {
  q?: string
  types?: SearchEntityType[]
  preset?: SearchPreset
  genre?: string
  categoryId?: string
  memberType?: string
  status?: string
  page?: number
  perPage?: number
}

export interface SearchFiltersPayload {
  types?: string[]
  preset?: string
  genre?: string
  categoryId?: string
  memberType?: string
  status?: string
}

export interface RecentSearch {
  id: string
  query: string
  filters: SearchFiltersPayload
  searchedAt: string
}

export interface SavedSearch {
  id: string
  name: string
  query: string
  filters: SearchFiltersPayload
  createdAt: string
}

export const ENTITY_TYPE_LABELS: Record<SearchEntityType, string> = {
  book: 'Book',
  member: 'Member',
  transaction: 'Transaction',
}

export const PRESET_LABELS: Record<SearchPreset, string> = {
  available: 'Available now',
  overdue: 'Overdue loans',
  most_borrowed: 'Most borrowed',
  new_arrivals: 'New arrivals',
}

export const PRESET_DESCRIPTIONS: Record<SearchPreset, string> = {
  available: 'Books with copies ready to borrow',
  overdue: 'Transactions past their due date',
  most_borrowed: 'Popular titles by checkout count',
  new_arrivals: 'Books added in the last 90 days',
}
