import type { HttpContext } from '@adonisjs/core/http'
import { tormsReportingService } from '#modules/records/services/torms/torms_reporting_service'
import {
  dashboardSummaryValidator,
  requestReportValidator,
  issuanceReportValidator,
} from '#modules/records/validators/alumni_reports'

function mapError(error: unknown, response: HttpContext['response']) {
  const status = (error as Error & { status?: number }).status ?? 500
  const message = error instanceof Error ? error.message : 'Request failed'
  if (status >= 400 && status < 600) {
    return response.status(status).send({ success: false, message })
  }
  throw error
}

export default class TormsReportsController {
  async dashboard({ auth, request, response }: HttpContext) {
    const user = auth.user!
    try {
      const filters = await request.validateUsing(dashboardSummaryValidator)
      const data = await tormsReportingService.dashboardSummary({
        organizationId: user.organizationId,
        actorUserId: user.id,
        from: filters.from,
        to: filters.to,
        locality: filters.locality,
      })
      return response.ok({ success: true, data })
    } catch (error) {
      return mapError(error, response)
    }
  }

  async requests({ auth, request, response }: HttpContext) {
    const user = auth.user!
    try {
      const filters = await request.validateUsing(requestReportValidator)
      const data = await tormsReportingService.requestReport({
        organizationId: user.organizationId,
        actorUserId: user.id,
        kind: filters.kind,
        status: filters.status,
        locality: filters.locality,
        certificationType: filters.certificationType,
        from: filters.from,
        to: filters.to,
        limit: filters.limit,
        offset: filters.offset,
      })
      if (filters.format === 'csv') {
        const columns =
          filters.kind === 'transcript'
            ? [
                'request_number',
                'student_number',
                'purpose',
                'status',
                'locality',
                'payment_status',
                'clearance_status',
                'requested_at',
                'released_at',
              ]
            : [
                'request_number',
                'student_number',
                'certification_type',
                'purpose',
                'status',
                'locality',
                'payment_status',
                'clearance_status',
                'requested_at',
                'released_at',
              ]
        const csv = tormsReportingService.toCsv(data.items as Array<Record<string, unknown>>, columns)
        response.header('Content-Type', 'text/csv; charset=utf-8')
        response.header(
          'Content-Disposition',
          `attachment; filename="torms-${filters.kind}-requests.csv"`
        )
        return response.send(csv)
      }
      return response.ok({ success: true, data: data.items, meta: data.meta, filters: data.filters })
    } catch (error) {
      return mapError(error, response)
    }
  }

  async issuances({ auth, request, response }: HttpContext) {
    const user = auth.user!
    try {
      const filters = await request.validateUsing(issuanceReportValidator)
      const data = await tormsReportingService.issuanceReport({
        organizationId: user.organizationId,
        actorUserId: user.id,
        kind: filters.kind,
        from: filters.from,
        to: filters.to,
        limit: filters.limit,
        offset: filters.offset,
      })
      if (filters.format === 'csv') {
        const columns =
          filters.kind === 'transcript'
            ? [
                'serial_number',
                'student_number',
                'copy_type',
                'issuance_status',
                'compliance_status',
                'signature_status',
                'issued_at',
                'qr_or_verification_code',
              ]
            : [
                'serial_number',
                'student_number',
                'certification_type',
                'issuance_status',
                'compliance_status',
                'signature_status',
                'issued_at',
                'qr_code',
              ]
        const csv = tormsReportingService.toCsv(data.items as Array<Record<string, unknown>>, columns)
        response.header('Content-Type', 'text/csv; charset=utf-8')
        response.header(
          'Content-Disposition',
          `attachment; filename="torms-${filters.kind}-issuances.csv"`
        )
        return response.send(csv)
      }
      return response.ok({ success: true, data: data.items, meta: data.meta })
    } catch (error) {
      return mapError(error, response)
    }
  }
}
