import { apiClient } from '@/lib/api-client'
import { normalizeListMeta, type PaginatedResult } from '@/lib/list-query'

function unwrapOne<T>(payload: unknown): T {
  const body = payload as { data?: T }
  return (body?.data ?? body) as T
}

function unwrapPage<T>(payload: unknown): PaginatedResult<T> {
  const body = payload as { data?: unknown; meta?: Record<string, unknown> }
  const rows = Array.isArray(body?.data)
    ? (body.data as T[])
    : Array.isArray(body)
      ? (body as T[])
      : []
  return { data: rows, meta: normalizeListMeta(body?.meta ?? null) }
}

export async function fetchDisbursementInvoices(params?: { page?: number; limit?: number }) {
  const { data } = await apiClient.get('/disbursement/invoices', {
    params: { limit: 20, ...params },
  })
  return unwrapPage<Record<string, unknown>>(data)
}

export async function createDisbursementInvoice(payload: {
  purchaseOrderId: string
  iarId?: string
  invoiceNumber: string
  amount: number
  invoiceDate?: string
}) {
  const { data } = await apiClient.post('/disbursement/invoices', payload)
  return unwrapOne<Record<string, unknown>>(data)
}

export async function matchDisbursementInvoice(id: string) {
  const { data } = await apiClient.post(`/disbursement/invoices/${id}/match`)
  return unwrapOne<Record<string, unknown>>(data)
}

export async function fetchDisbursementVouchers(params?: { page?: number; limit?: number }) {
  const { data } = await apiClient.get('/disbursement/vouchers', {
    params: { limit: 20, ...params },
  })
  return unwrapPage<Record<string, unknown>>(data)
}

export async function createDisbursementVoucher(payload: {
  vendorInvoiceId: string
  paymentMode?: string
  obligationId?: string
  payeeName?: string
}) {
  const { data } = await apiClient.post('/disbursement/vouchers', payload)
  return unwrapOne<Record<string, unknown>>(data)
}

export async function approveDisbursementVoucher(id: string) {
  const { data } = await apiClient.post(`/disbursement/vouchers/${id}/approve`)
  return unwrapOne<Record<string, unknown>>(data)
}

export async function issueDisbursementCheque(
  id: string,
  payload: {
    chequeNumber?: string
    bankAccountId?: string
    fundId?: string
    chequeDate?: string
  }
) {
  const { data } = await apiClient.post(`/disbursement/vouchers/${id}/cheque`, payload)
  return unwrapOne<Record<string, unknown>>(data)
}

export async function recordDisbursementAda(id: string, payload: { bankReference?: string }) {
  const { data } = await apiClient.post(`/disbursement/vouchers/${id}/ada`, payload)
  return unwrapOne<Record<string, unknown>>(data)
}

export async function fetchDisbursementCheques(params?: { page?: number; limit?: number }) {
  const { data } = await apiClient.get('/disbursement/cheques', {
    params: { limit: 20, ...params },
  })
  return unwrapPage<Record<string, unknown>>(data)
}
