import { fetchJson } from '#modules/records/services/integrations/http_json_client'
import Student from '#modules/enrollment/models/student'
import { GradeRecordsService } from '#modules/enrollment/services/grade_records_service'

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
    return (process.env.USIS_API_URL ?? process.env.ENROLLMENT_API_URL ?? '').replace(/\/$/, '')
  }

  private serviceKey() {
    return process.env.USIS_SERVICE_API_KEY ?? process.env.SERVICE_API_KEY ?? ''
  }

  isConfigured() {
    return Boolean(this.baseUrl() && this.serviceKey()) || Boolean(this.exportOverride)
  }

  private resolveOrganizationId(organizationId: string) {
    const mapped = process.env.USIS_ORGANIZATION_ID?.trim()
    return mapped || organizationId
  }

  async exportStudentGrades(studentNumber: string, organizationId: string): Promise<ExportResult> {
    if (this.exportOverride) {
      return this.exportOverride(studentNumber, organizationId)
    }

    if (!this.baseUrl() || !this.serviceKey()) {
      return this.exportFromLocalEnrollment(studentNumber)
    }

    const usisOrgId = this.resolveOrganizationId(organizationId)
    const url = `${this.baseUrl()}/api/v1/enrollment/internal/students/${encodeURIComponent(studentNumber)}/grades-export?organizationId=${encodeURIComponent(usisOrgId)}`
    const result = await fetchJson<UsisGradesExport>(url, {
      headers: { 'X-Service-Api-Key': this.serviceKey() },
      timeoutMs: Number(process.env.USIS_HTTP_TIMEOUT_MS ?? 8_000),
    })

    if (!result.ok) {
      return { ...result, contract: 'INT-TOR-01' }
    }

    return { ...result, contract: 'INT-TOR-01' }
  }

  private async exportFromLocalEnrollment(studentNumber: string): Promise<ExportResult> {
    const student = await Student.query().where('student_number', studentNumber).preload('program').first()
    if (!student) {
      return {
        ok: false,
        status: 404,
        error: 'Student was not found in USiS',
        unavailable: false,
        contract: 'INT-TOR-01',
      }
    }

    const records = await new GradeRecordsService().academicRecordsForStudent(
      student.organizationId,
      student.id
    )
    return {
      ok: true,
      status: 200,
      contract: 'INT-TOR-01',
      data: {
        success: true,
        data: {
          student: records.student,
          grades: records.grades,
          gwa: records.gwa,
          history: records.history,
        },
      },
    }
  }
}

export const usisAcademicClient = new UsisAcademicClient()
