import {
  getApiBaseUrl,
  getDefaultTenantSlug,
  type ApiResponse,
  type OpacBookSummary,
  type OpacCitations,
} from '@librastack/client-config'
import { opacHttp } from '@/lib/opac-http'

function headers() {
  return {
    'X-Tenant-Slug': getDefaultTenantSlug(),
    Accept: 'application/json',
  }
}

const base = () => `${getApiBaseUrl()}/public/opac`

export type OpacSearchQuery = {
  q?: string
  title?: string
  author?: string
  subject?: string
  callNumber?: string
  year?: string
  isbn?: string
  language?: string
  resourceType?: 'physical' | 'digital' | 'all'
  availability?: 'available' | 'any'
}

export async function searchOpac(query: OpacSearchQuery) {
  const params: Record<string, string | number> = { perPage: 25 }
  for (const [key, value] of Object.entries(query)) {
    const text = value?.trim()
    if (!text || text === 'all' || text === 'any') continue
    if (key === 'year') {
      const year = Number(text)
      if (Number.isFinite(year)) params.year = year
      continue
    }
    params[key] = text
  }
  const { data } = await opacHttp.get<
    ApiResponse<Array<OpacBookSummary & { detailProfile?: 'thesis' | 'catalog'; materialType?: string }>>
  >(`${base()}/search`, {
    params,
    headers: headers(),
  })
  return data.data
}

export interface OpacBookDetail extends OpacBookSummary {
  description?: string | null
  publisher?: string | null
  citations?: OpacCitations
  shelfLocations?: string[]
  category?: string | null
  coverImageUrl?: string | null
  materialType?: string | null
  detailProfile?: 'thesis' | 'catalog'
  degree?: string | null
  department?: string | null
  advisor?: string | null
  issn?: string | null
}

export async function getOpacBook(id: string) {
  const { data } = await opacHttp.get<ApiResponse<OpacBookDetail>>(`${base()}/books/${id}`, {
    headers: headers(),
  })
  return data.data
}

export async function getOpacCitations(id: string) {
  const { data } = await opacHttp.get<ApiResponse<OpacCitations>>(`${base()}/books/${id}/citations`, {
    headers: headers(),
  })
  return data.data
}

export interface ReadingListItem {
  id: string
  bookId: string
  title: string | null
  position: number
}

export interface ReadingListRecord {
  id: string
  name: string
  description: string | null
  items: ReadingListItem[]
}

const authed = () => ({
  headers: headers(),
})

export async function fetchReadingLists() {
  const { data } = await opacHttp.get<ApiResponse<ReadingListRecord[]>>(
    `${getApiBaseUrl()}/portal/reading-lists`,
    authed()
  )
  return data.data
}

export async function createReadingList(name: string) {
  const { data } = await opacHttp.post<ApiResponse<ReadingListRecord>>(
    `${getApiBaseUrl()}/portal/reading-lists`,
    { name },
    authed()
  )
  return data.data
}

export async function addBookToReadingList(listId: string, bookId: string) {
  const { data } = await opacHttp.post<ApiResponse<ReadingListRecord>>(
    `${getApiBaseUrl()}/portal/reading-lists/${listId}/items`,
    { bookId },
    authed()
  )
  return data.data
}

export async function requestAcquisition(input: {
  title: string
  authors?: string
  materialType?: string
  justification?: string
  isbn13?: string
  publicationYear?: number
}) {
  const { data } = await opacHttp.post<
    ApiResponse<{ id: string; requestNumber: string; status: string; title: string }>
  >(`${getApiBaseUrl()}/portal/acquisition-requests`, input, authed())
  return data.data
}

export async function removeReadingListItem(listId: string, itemId: string) {
  const { data } = await opacHttp.delete<ApiResponse<ReadingListRecord>>(
    `${getApiBaseUrl()}/portal/reading-lists/${listId}/items/${itemId}`,
    authed()
  )
  return data.data
}

export interface PortalLoan {
  id: string
  bookTitle?: string | null
  status: string
  dueAt?: string | null
  renewalCount?: number
  maxRenewals?: number
}

export interface PortalHold {
  id: string
  bookId: string
  bookTitle?: string | null
  status: string
  queuePosition?: number | null
  expiresAt?: string | null
}

export interface PortalAccount {
  member: { fullName: string; libraryCardNumber: string }
  activeLoans: PortalLoan[]
  reservations: PortalHold[]
}

export interface PortalLibraryCard {
  fullName: string
  libraryCardNumber: string
  memberType: string
  department: string | null
  tenantName: string
  qrPayload: string
}

export async function fetchPortalCard() {
  const { data } = await opacHttp.get<ApiResponse<PortalLibraryCard>>(
    `${getApiBaseUrl()}/portal/card`,
    authed()
  )
  return data.data
}

export async function fetchPortalAccount() {
  const { data } = await opacHttp.get<ApiResponse<PortalAccount>>(
    `${getApiBaseUrl()}/portal/me`,
    authed()
  )
  return data.data
}

export interface PortalNotice {
  id: string
  title: string
  body: string
  readAt: string | null
}

export async function fetchPortalNotices() {
  const { data } = await opacHttp.get<ApiResponse<PortalNotice[]>>(
    `${getApiBaseUrl()}/portal/notices`,
    authed()
  )
  return data.data
}

export async function markPortalNoticeRead(id: string) {
  const { data } = await opacHttp.post<ApiResponse<PortalNotice>>(
    `${getApiBaseUrl()}/portal/notices/${id}/read`,
    {},
    authed()
  )
  return data.data
}

export async function placePortalHold(bookId: string) {
  const { data } = await opacHttp.post<ApiResponse<PortalHold>>(
    `${getApiBaseUrl()}/portal/reservations`,
    { bookId },
    authed()
  )
  return data.data
}

export async function cancelPortalHold(reservationId: string) {
  const { data } = await opacHttp.post<ApiResponse<PortalHold>>(
    `${getApiBaseUrl()}/portal/reservations/${reservationId}/cancel`,
    {},
    authed()
  )
  return data.data
}

export async function renewPortalLoan(loanId: string) {
  const { data } = await opacHttp.post<ApiResponse<PortalLoan>>(
    `${getApiBaseUrl()}/portal/loans/${loanId}/renew`,
    {},
    authed()
  )
  return data.data
}

export interface QueueTicket {
  id: string
  ticketNumber: string
  serviceType: string
  status: string
}

export interface ElibrarySearchResult {
  catalog: Array<{ id: string; title: string; authors: string | null; year: number | null }>
  repository: Array<{
    id: string
    title: string
    authors: string | null
    subjects: string | null
    year: number | null
    resourceType: string
    accessLevel: string
    canOpen: boolean
  }>
  electronic: Array<{
    id: string
    title: string
    provider: string | null
    resourceKind: string
    authMethod: string
  }>
  counts: { catalog: number; repository: number; electronic: number }
}

export async function searchElibrary(query: {
  q?: string
  author?: string
  subject?: string
  year?: string
}) {
  const params: Record<string, string | number> = {}
  for (const [key, value] of Object.entries(query)) {
    const text = value?.trim()
    if (!text) continue
    if (key === 'year') {
      const year = Number(text)
      if (Number.isFinite(year)) params.year = year
      continue
    }
    params[key] = text
  }
  const { data } = await opacHttp.get<ApiResponse<ElibrarySearchResult>>(
    `${getApiBaseUrl()}/public/elibrary/search`,
    { params, headers: headers() }
  )
  return data.data
}

export interface ElibraryDocument {
  id: string
  title: string
  authors: string | null
  abstract: string | null
  resourceType: string
  accessLevel: string
  fileUrl: string | null
  viewCount: number
  downloadCount: number
}

export async function openRepositoryItem(id: string, mode: 'view' | 'download' = 'view') {
  const { data } = await opacHttp.get<ApiResponse<ElibraryDocument>>(
    `${getApiBaseUrl()}/public/elibrary/repository/${id}`,
    { params: { mode }, headers: headers() }
  )
  return data.data
}

export async function openElectronicResource(id: string) {
  const { data } = await opacHttp.post<
    ApiResponse<{ id: string; title: string; accessUrl: string | null; viewCount: number; authMethod: string }>
  >(`${getApiBaseUrl()}/public/elibrary/eresources/${id}/open`, {}, { headers: headers() })
  return data.data
}

export interface LocatorMatch {
  copyId: string
  bookId: string
  barcode: string
  shelfLocation: string | null
  status: string
  bookTitle?: string
  available: boolean
  floor: string | null
  aisle: string | null
  shelf: string | null
  shelfLabel: string | null
}

export interface LocatorShelf {
  code: string
  label: string
  floor: string | null
  aisle: string | null
  shelf: string | null
  availableCount: number
  copyCount: number
}

export async function fetchLocator(q: string) {
  const { data } = await opacHttp.get<
    ApiResponse<{ matches: LocatorMatch[]; shelves: LocatorShelf[] }>
  >(`${getApiBaseUrl()}/public/locator`, {
    params: { q },
    headers: headers(),
  })
  return data.data
}

export async function fetchQueueBoard() {
  const { data } = await opacHttp.get<ApiResponse<QueueTicket[]>>(
    `${getApiBaseUrl()}/public/queue/board`,
    { headers: headers() }
  )
  return data.data
}
