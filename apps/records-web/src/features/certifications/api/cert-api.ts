import { apiClient } from '@/lib/api-client'

export type CertType = {
  id: string
  code: string
  official_name: string
  description: string | null
  active: boolean
  international_capable: boolean
  academic_focus: string
}

export type CertRequest = {
  id: string
  request_number: string
  student_number: string
  certification_type: string
  purpose: string | null
  status: string
  locality: string
  agency: string | null
  destination_country: string | null
  urgency: string | null
  copies: number
  payment_status: string | null
  clearance_status: string | null
  requested_at: string
  released_at: string | null
}

export type CertRequestDetail = {
  request: CertRequest
  history: Array<Record<string, unknown>>
  attachments: Array<Record<string, unknown>>
  clearanceChecks: Array<Record<string, unknown>>
  payments: Array<Record<string, unknown>>
  typeConfig: CertType | null
}

export async function listCertTypes(activeOnly = true) {
  const { data } = await apiClient.get('/certifications/types', {
    params: { activeOnly },
  })
  return (data.data ?? data) as CertType[]
}

export async function listCertRequests(params?: {
  status?: string
  studentNumber?: string
  requestNumber?: string
  certificationType?: string
  locality?: string
  mineOnly?: boolean
  page?: number
  limit?: number
}) {
  const { data } = await apiClient.get('/certifications/requests', { params })
  const rows = (data.data ?? data) as CertRequest[]
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

export async function submitCertRequest(body: {
  studentNumber: string
  certificationType: string
  purpose: string
  locality?: 'local' | 'foreign'
  agency?: string
  destinationCountry?: string
  urgency?: string
  copies?: number
}) {
  const { data } = await apiClient.post('/certifications/requests', body)
  return data.data
}

export async function getCertRequest(idOrNumber: string) {
  const { data } = await apiClient.get(
    `/certifications/requests/${encodeURIComponent(idOrNumber)}`
  )
  return data.data as CertRequestDetail
}

export async function getCertAcademicRecords(idOrNumber: string, refreshFromUsis = true) {
  const { data } = await apiClient.get(
    `/certifications/requests/${encodeURIComponent(idOrNumber)}/academic-records`,
    { params: { refreshFromUsis } }
  )
  return data.data
}

export async function transitionCertRequest(
  idOrNumber: string,
  body: {
    toStatus: string
    reason?: string
    clearanceOverride?: boolean
    paymentOverride?: boolean
  }
) {
  const { data } = await apiClient.post(
    `/certifications/requests/${encodeURIComponent(idOrNumber)}/transition`,
    body
  )
  return data.data as CertRequest
}

export async function addCertAttachmentRef(
  idOrNumber: string,
  body: { udmsDocumentId: string; kind?: string }
) {
  const { data } = await apiClient.post(
    `/certifications/requests/${encodeURIComponent(idOrNumber)}/attachments`,
    body
  )
  return data.data
}

export async function verifyCertPayment(
  idOrNumber: string,
  body: { paymentRef: string; orNumber?: string }
) {
  const { data } = await apiClient.post(
    `/certifications/requests/${encodeURIComponent(idOrNumber)}/verify-payment`,
    body
  )
  return data.data
}

export type CertIssuance = {
  id: string
  serial_number: string
  qr_code: string
  certification_type: string
  issuance_status: string
  compliance_status: string
  signature_status: string
  issued_at: string | null
  document_payload_json?: Record<string, unknown>
}

export async function listCertIssuances(idOrNumber: string) {
  const { data } = await apiClient.get(
    `/certifications/requests/${encodeURIComponent(idOrNumber)}/issuances`
  )
  return (data.data ?? []) as CertIssuance[]
}

export async function generateCertDocument(idOrNumber: string) {
  const { data } = await apiClient.post(
    `/certifications/requests/${encodeURIComponent(idOrNumber)}/generate`
  )
  return data.data
}

export async function issueCertDocument(
  issuanceId: string,
  body?: { releaseRequest?: boolean }
) {
  const { data } = await apiClient.post(
    `/certifications/issuances/${issuanceId}/issue`,
    body ?? {}
  )
  return data.data
}
