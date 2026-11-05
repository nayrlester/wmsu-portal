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

export async function searchOpac(q: string) {
  const { data } = await opacHttp.get<ApiResponse<OpacBookSummary[]>>(`${base()}/search`, {
    params: { q, perPage: 25 },
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

export interface QueueTicket {
  id: string
  ticketNumber: string
  serviceType: string
  status: string
}

export async function fetchQueueBoard() {
  const { data } = await opacHttp.get<ApiResponse<QueueTicket[]>>(
    `${getApiBaseUrl()}/public/queue/board`,
    { headers: headers() }
  )
  return data.data
}
