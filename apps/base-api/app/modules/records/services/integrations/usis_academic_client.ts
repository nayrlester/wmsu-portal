import env from '#start/env'
import { fetchJson } from '#modules/records/services/integrations/http_json_client'

export type UsisGradesExport = {
  success?: boolean
  data?: {
    student?: Record<string, unknown>
    grades?: Array<Record<string, unknown>>
    gwa?: Record<string, unknown> | Array<Record<string, unknown>> | null
    history?: Array<Record<string, unknown>>
    meta?: Record<string, unknown>
  }
}

type ExportResult =
  | ({ ok: true; status: number; data: UsisGradesExport; contract: 'INT-TOR-01' })
  | {
      ok: false
      status: number | null
      error: string
      unavailable: boolean
      contract: 'INT-TOR-01'
    }

export class UsisAcademicClient {
  /** Test-only override; never set in production code paths. */
  exportOverride: null | ((studentNumber: string, organizationId: string) => Promise<ExportResult>) =
    null

  private baseUrl() {
    return (env.get('USIS_API_URL') ?? env.get('ENROLLMENT_API_URL') ?? '').replace(/\/$/, '')
  }

  private serviceKey() {
    return env.get('USIS_SERVICE_API_KEY') ?? env.get('SERVICE_API_KEY') ?? ''
  }

  isConfigured() {
    return Boolean(this.baseUrl() && this.serviceKey()) || Boolean(this.exportOverride)
  }

  private resolveOrganizationId(organizationId: string) {
    const mapped = env.get('USIS_ORGANIZATION_ID')?.trim()
    return mapped || organizationId
  }

  async exportStudentGrades(studentNumber: string, organizationId: string): Promise<ExportResult> {
    if (this.exportOverride) {
      return this.exportOverride(studentNumber, organizationId)
    }

    if (!this.baseUrl() || !this.serviceKey()) {
      return {
        ok: false,
        status: null,
        error: 'USIS_API_URL (or ENROLLMENT_API_URL) and service API key are not configured',
        unavailable: true,
        contract: 'INT-TOR-01',
      }
    }

    const usisOrgId = this.resolveOrganizationId(organizationId)
    const url = `${this.baseUrl()}/api/v1/internal/students/${encodeURIComponent(studentNumber)}/grades-export?organizationId=${encodeURIComponent(usisOrgId)}`
    const result = await fetchJson<UsisGradesExport>(url, {
      headers: { 'X-Service-Api-Key': this.serviceKey() },
      timeoutMs: env.get('USIS_HTTP_TIMEOUT_MS') ?? 8_000,
    })

    if (!result.ok) {
      return { ...result, contract: 'INT-TOR-01' }
    }

    return { ...result, contract: 'INT-TOR-01' }
  }
}

export const usisAcademicClient = new UsisAcademicClient()
