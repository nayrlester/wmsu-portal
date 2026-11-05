import env from '#start/env'
import { fetchJson } from '#modules/records/services/integrations/http_json_client'

/**
 * UFMS document-fee / payment verification client (INT-TOR-06/07).
 * Does not invent fee amounts or post ledger entries. Returns unavailable when contract path is unset.
 */
export class UfmsPaymentClient {
  private baseUrl() {
    return (env.get('UFMS_API_URL') ?? '').replace(/\/$/, '')
  }

  private serviceKey() {
    return env.get('UFMS_SERVICE_API_KEY') ?? env.get('SERVICE_API_KEY') ?? ''
  }

  isConfigured() {
    return Boolean(this.baseUrl() && this.serviceKey())
  }

  async verifyPaymentReference(input: {
    organizationId: string
    paymentRef: string
    orNumber?: string
  }) {
    const path = env.get('UFMS_PAYMENT_VERIFY_PATH')
    if (!this.isConfigured() || !path) {
      return {
        ok: false as const,
        status: null,
        error:
          'UFMS payment verification is not configured (UFMS_API_URL / UFMS_PAYMENT_VERIFY_PATH). Contract INT-TOR-07 remains planned.',
        unavailable: true,
        contract: 'INT-TOR-07' as const,
      }
    }

    const url = `${this.baseUrl()}${path.startsWith('/') ? path : `/${path}`}`
    const result = await fetchJson<Record<string, unknown>>(url, {
      method: 'POST',
      headers: { 'X-Service-Api-Key': this.serviceKey() },
      body: {
        organizationId: input.organizationId,
        paymentRef: input.paymentRef,
        orNumber: input.orNumber ?? null,
      },
      timeoutMs: env.get('UFMS_HTTP_TIMEOUT_MS') ?? 8_000,
    })

    return { ...result, contract: 'INT-TOR-07' as const }
  }

  async getDocumentFeeBalance(input: { organizationId: string; studentNumber: string }) {
    const path = env.get('UFMS_DOCUMENT_FEE_BALANCE_PATH')
    if (!this.isConfigured() || !path) {
      return {
        ok: false as const,
        status: null,
        error:
          'UFMS document-fee balance path is not configured. Contract INT-TOR-07 remains planned; no fee amounts invented.',
        unavailable: true,
        contract: 'INT-TOR-07' as const,
      }
    }

    const url = `${this.baseUrl()}${path.startsWith('/') ? path : `/${path}`}?organizationId=${encodeURIComponent(input.organizationId)}&studentNumber=${encodeURIComponent(input.studentNumber)}`
    const result = await fetchJson<Record<string, unknown>>(url, {
      headers: { 'X-Service-Api-Key': this.serviceKey() },
      timeoutMs: env.get('UFMS_HTTP_TIMEOUT_MS') ?? 8_000,
    })

    return { ...result, contract: 'INT-TOR-07' as const }
  }
}

export const ufmsPaymentClient = new UfmsPaymentClient()
