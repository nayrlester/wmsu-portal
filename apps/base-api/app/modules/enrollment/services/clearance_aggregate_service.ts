import env from '#start/env'
import Student from '#modules/enrollment/models/student'
import type { ClearanceReportSnapshot } from '#modules/enrollment/models/usis_clearance_report'
import { financeInternalPath } from '#modules/enrollment/services/integrations/finance_api_paths'
import { DateTime } from 'luxon'

type ServiceCheck = { cleared: boolean; openItems?: number; error?: boolean }

export class ClearanceAggregateService {
  async loadStudent(organizationId: string, studentNumber: string) {
    return Student.query()
      .where('organization_id', organizationId)
      .where('student_number', studentNumber)
      .first()
  }

  async crossSystemChecks(
    studentNumber: string,
    organizationId?: string | null
  ): Promise<{
    finance: ServiceCheck
    inventory: ServiceCheck
    library: ServiceCheck
  }> {
    const inventoryUrl = (env.get('INVENTORY_API_URL') ?? 'http://127.0.0.1:3500').replace(/\/$/, '')
    const libraryUrl = (env.get('LIBRARY_API_URL') ?? 'http://127.0.0.1:3500').replace(/\/$/, '')
    const serviceApiKey = env.get('SERVICE_API_KEY') ?? ''
    const orgQs = organizationId
      ? `?organizationId=${encodeURIComponent(organizationId)}`
      : ''

    const checks = await Promise.allSettled([
      this.checkService(`${financeInternalPath(`/clearance/${studentNumber}`)}${orgQs}`, serviceApiKey),
      this.checkService(`${inventoryUrl}/api/v1/inventory/internal/clearance/${studentNumber}`, serviceApiKey),
      this.checkService(`${libraryUrl}/api/v1/library/internal/clearance/${studentNumber}`, serviceApiKey),
    ])

    return {
      finance: checks[0].status === 'fulfilled' ? checks[0].value : { cleared: false, error: true },
      inventory: checks[1].status === 'fulfilled' ? checks[1].value : { cleared: false, error: true },
      library: checks[2].status === 'fulfilled' ? checks[2].value : { cleared: false, error: true },
    }
  }

  async buildSnapshot(student: Student): Promise<ClearanceReportSnapshot> {
    const checks = await this.crossSystemChecks(student.studentNumber, student.organizationId)
    const cleared = checks.finance.cleared && checks.inventory.cleared && checks.library.cleared
    return {
      schemaVersion: '1',
      studentNumber: student.studentNumber,
      studentName: `${student.lastName}, ${student.firstName}`,
      cleared,
      generatedAt: DateTime.now().toISO()!,
      checks,
    }
  }

  private async checkService(url: string, apiKey: string): Promise<ServiceCheck> {
    try {
      const res = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'X-Service-Api-Key': apiKey,
        },
      })
      if (!res.ok) return { cleared: false }
      const body = (await res.json()) as { data?: { cleared: boolean; openItems?: number } }
      return body.data ?? { cleared: false }
    } catch {
      return { cleared: false, error: true }
    }
  }
}

export const clearanceAggregateService = new ClearanceAggregateService()
