import env from '#start/env'
import { fetchJson } from '#modules/records/services/integrations/http_json_client'

export class PlatformClearanceClient {
  /** Test-only override; never set in production code paths. */
  getClearanceOverride: null | ((studentNumber: string) => Promise<{
    ok: true
    status: number
    data: Record<string, unknown>
    contract: 'INT-TOR-05'
  } | {
    ok: false
    status: number | null
    error: string
    unavailable: boolean
    contract: 'INT-TOR-05'
  }>) = null

  private baseUrl() {
    return (env.get('PLATFORM_IDENTITY_URL') ?? '').replace(/\/$/, '')
  }

  private serviceKey() {
    return env.get('PLATFORM_SERVICE_API_KEY') ?? env.get('SERVICE_API_KEY') ?? ''
  }

  isConfigured() {
    return Boolean(this.baseUrl() && this.serviceKey()) || Boolean(this.getClearanceOverride)
  }

  async getClearance(studentNumber: string) {
    if (this.getClearanceOverride) {
      return this.getClearanceOverride(studentNumber)
    }

    if (!this.isConfigured()) {
      return {
        ok: false as const,
        status: null,
        error: 'PLATFORM_IDENTITY_URL / service key not configured for clearance retrieval',
        unavailable: true,
        contract: 'INT-TOR-05' as const,
      }
    }

    const url = `${this.baseUrl()}/api/v1/integrations/clearance/${encodeURIComponent(studentNumber)}`
    const result = await fetchJson<Record<string, unknown>>(url, {
      headers: { 'X-Service-Api-Key': this.serviceKey() },
      timeoutMs: env.get('PLATFORM_HTTP_TIMEOUT_MS') ?? 8_000,
    })

    return { ...result, contract: 'INT-TOR-05' as const }
  }
}

export const platformClearanceClient = new PlatformClearanceClient()
