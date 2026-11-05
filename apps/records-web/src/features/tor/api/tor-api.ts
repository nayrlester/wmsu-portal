import { apiClient } from '@/lib/api-client'

export type TorRequest = {
  id: string
  request_number: string
  student_number: string
  purpose: string | null
  status: string
  locality: string
  agency: string | null
  destination_country: string | null
  urgency: string | null
  copies: number
  first_request_tag: string | null
  payment_status: string | null
  clearance_status: string | null
  requested_at: string
  released_at: string | null
}

export type TorRequestDetail = {
  request: TorRequest
  history: Array<Record<string, unknown>>
  attachments: Array<Record<string, unknown>>
  clearanceChecks: Array<Record<string, unknown>>
  payments: Array<Record<string, unknown>>
}

export async function listTorRequests(params?: {
  status?: string
  studentNumber?: string
  requestNumber?: string
  mineOnly?: boolean
  page?: number
  limit?: number
}) {
  const { data } = await apiClient.get('/tor/requests', { params })
  const rows = (data.data ?? data) as TorRequest[]
  const meta = (data.meta ?? {}) as {
    total?: number
    perPage?: number
    currentPage?: number
    lastPage?: number
  }
  return {
    data: Array.isArray(rows) ? rows : [],
    meta: {
      total: meta.total,
      perPage: meta.perPage,
      currentPage: meta.currentPage,
      lastPage: meta.lastPage,
    },
  }
}

export async function submitTorRequest(body: {
  studentNumber: string
  purpose: string
  locality?: 'local' | 'foreign'
  agency?: string
  destinationCountry?: string
  urgency?: string
  copies?: number
  isFirstRequestAfterGraduation?: boolean
}) {
  const { data } = await apiClient.post('/tor/requests', body)
  return data.data
}

export async function getTorRequest(idOrNumber: string) {
  const { data } = await apiClient.get(`/tor/requests/${encodeURIComponent(idOrNumber)}`)
  return data.data as TorRequestDetail
}

export async function getTorAcademicRecords(idOrNumber: string, refreshFromUsis = true) {
  const { data } = await apiClient.get(
    `/tor/requests/${encodeURIComponent(idOrNumber)}/academic-records`,
    { params: { refreshFromUsis } }
  )
  return data.data
}

export async function transitionTorRequest(
  idOrNumber: string,
  body: {
    toStatus: string
    reason?: string
    clearanceOverride?: boolean
    paymentOverride?: boolean
  }
) {
  const { data } = await apiClient.post(
    `/tor/requests/${encodeURIComponent(idOrNumber)}/transition`,
    body
  )
  return data.data as TorRequest
}

export async function confirmPhysicalDocuments(idOrNumber: string, notes?: string) {
  const { data } = await apiClient.post(
    `/tor/requests/${encodeURIComponent(idOrNumber)}/confirm-physical`,
    { notes }
  )
  return data.data
}

export async function addTorAttachmentRef(
  idOrNumber: string,
  body: { udmsDocumentId: string; kind?: string }
) {
  const { data } = await apiClient.post(
    `/tor/requests/${encodeURIComponent(idOrNumber)}/attachments`,
    body
  )
  return data.data
}

export async function verifyTorPayment(
  idOrNumber: string,
  body: { paymentRef: string; orNumber?: string }
) {
  const { data } = await apiClient.post(
    `/tor/requests/${encodeURIComponent(idOrNumber)}/verify-payment`,
    body
  )
  return data.data
}

export type TorIssuance = {
  id: string
  serial_number: string
  qr_or_verification_code: string
  copy_type: string
  issuance_status: string
  compliance_status: string
  signature_status: string
  issued_at: string | null
  document_payload_json?: Record<string, unknown>
}

export async function listTorIssuances(idOrNumber: string) {
  const { data } = await apiClient.get(
    `/tor/requests/${encodeURIComponent(idOrNumber)}/issuances`
  )
  return (data.data ?? []) as TorIssuance[]
}

export async function generateTorDocument(
  idOrNumber: string,
  body?: { copyType?: 'student' | 'official' }
) {
  const { data } = await apiClient.post(
    `/tor/requests/${encodeURIComponent(idOrNumber)}/generate`,
    body ?? {}
  )
  return data.data
}

export async function issueTorDocument(
  issuanceId: string,
  body?: { releaseRequest?: boolean }
) {
  const { data } = await apiClient.post(`/tor/issuances/${issuanceId}/issue`, body ?? {})
  return data.data
}
