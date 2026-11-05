import env from '#start/env'
import { fetchJson } from '#modules/records/services/integrations/http_json_client'

/**
 * UDMS document store/retrieve client (INT-TOR-09 / DMS-010).
 * Does not create a parallel document repository. Returns unavailable when payload contract path unset.
 */
export class UdmsDocumentClient {
  private baseUrl() {
    return (env.get('UDMS_API_URL') ?? '').replace(/\/$/, '')
  }

  private serviceKey() {
    return env.get('UDMS_SERVICE_API_KEY') ?? env.get('SERVICE_API_KEY') ?? ''
  }

  isConfigured() {
    return Boolean(this.baseUrl() && this.serviceKey())
  }

  async resolveDocumentReference(documentId: string) {
    const path = env.get('UDMS_DOCUMENT_RESOLVE_PATH')
    if (!this.isConfigured() || !path) {
      return {
        ok: false as const,
        status: null,
        error:
          'UDMS document resolve path is not configured (UDMS_API_URL / UDMS_DOCUMENT_RESOLVE_PATH). Contract INT-TOR-09 / DMS-010 payload remains For Clarification.',
        unavailable: true,
        contract: 'INT-TOR-09' as const,
      }
    }

    const url = `${this.baseUrl()}${path.startsWith('/') ? path : `/${path}`}`.replace(
      ':documentId',
      encodeURIComponent(documentId)
    )
    const result = await fetchJson<Record<string, unknown>>(url, {
      headers: { 'X-Service-Api-Key': this.serviceKey() },
      timeoutMs: env.get('UDMS_HTTP_TIMEOUT_MS') ?? 8_000,
    })

    return { ...result, contract: 'INT-TOR-09' as const }
  }

  async registerDocumentReference(input: {
    organizationId: string
    metadata: Record<string, unknown>
  }) {
    const path = env.get('UDMS_DOCUMENT_STORE_PATH')
    if (!this.isConfigured() || !path) {
      return {
        ok: false as const,
        status: null,
        error:
          'UDMS document store path is not configured. TORMS will not invent a local blob store (TOR-003 / DMS-010).',
        unavailable: true,
        contract: 'INT-TOR-09' as const,
      }
    }

    const url = `${this.baseUrl()}${path.startsWith('/') ? path : `/${path}`}`
    const result = await fetchJson<Record<string, unknown>>(url, {
      method: 'POST',
      headers: { 'X-Service-Api-Key': this.serviceKey() },
      body: input,
      timeoutMs: env.get('UDMS_HTTP_TIMEOUT_MS') ?? 8_000,
    })

    return { ...result, contract: 'INT-TOR-09' as const }
  }
}

export const udmsDocumentClient = new UdmsDocumentClient()
