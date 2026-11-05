import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import { RecordsLifecycleStatus } from '#modules/documents/domain/enums/index'
import { documentRepository } from '#infrastructure/repositories/document_repository'
import { recordsInventoryService } from '#modules/documents/services/records_inventory_service'
import { recordsLifecycleService } from '#modules/documents/services/records_lifecycle_service'
import { opsReportingService } from '#modules/documents/services/ops_reporting_service'
import { DocumentAccessPolicy } from '#modules/documents/domain/documents/document_access_policy'

const inventoryValidator = vine.compile(
  vine.object({
    officeId: vine.string().uuid().optional(),
    napCategory: vine.string().trim().optional(),
    lifecycleStatus: vine.enum(Object.values(RecordsLifecycleStatus)).optional(),
    year: vine.number().min(1900).max(2100).optional(),
    dueForArchive: vine.boolean().optional(),
    dueWithinDays: vine.number().min(1).max(365).optional(),
    page: vine.number().min(1).optional(),
    limit: vine.number().min(1).max(200).optional(),
    format: vine.enum(['json', 'csv'] as const).optional(),
  })
)

const lifecycleValidator = vine.compile(
  vine.object({
    lifecycleStatus: vine.enum(Object.values(RecordsLifecycleStatus)),
    reason: vine.string().trim().maxLength(500).optional(),
  })
)

const opsReportValidator = vine.compile(
  vine.object({
    format: vine.enum(['json', 'csv'] as const).optional(),
  })
)

export default class RecordsController {
  async inventory({ request, response }: HttpContext) {
    const filters = await request.validateUsing(inventoryValidator, { data: request.qs() })
    const paginator = await recordsInventoryService.list(filters)
    const rows = paginator.all()

    if (filters.format === 'csv') {
      const csv = recordsInventoryService.toCsv(rows)
      response.header('Content-Type', 'text/csv; charset=utf-8')
      response.header('Content-Disposition', 'attachment; filename="records-inventory.csv"')
      return response.send(csv)
    }

    return response.ok({
      data: rows.map((doc) => recordsInventoryService.serializeRow(doc)),
      meta: paginator.getMeta(),
    })
  }

  async summary({ response }: HttpContext) {
    const summary = await recordsInventoryService.summary()
    return response.ok(summary)
  }

  async opsReport({ request, response }: HttpContext) {
    const filters = await request.validateUsing(opsReportValidator, { data: request.qs() })
    const report = await opsReportingService.build()

    if (filters.format === 'csv') {
      const csv = opsReportingService.toCsv(report)
      response.header('Content-Type', 'text/csv; charset=utf-8')
      response.header('Content-Disposition', 'attachment; filename="ops-report.csv"')
      return response.send(csv)
    }

    return response.ok(report)
  }

  async updateLifecycle({ params, request, auth, response }: HttpContext) {
    const payload = await request.validateUsing(lifecycleValidator)
    const document = await documentRepository.findByIdOrFail(params.id, auth.user!.id)
    DocumentAccessPolicy.assertCanModify(document, auth.user!.id)

    await recordsLifecycleService.transitionLifecycle(
      document,
      payload.lifecycleStatus,
      auth.user!,
      { reason: payload.reason }
    )

    return response.ok({
      id: document.id,
      lifecycleStatus: document.lifecycleStatus,
      status: document.status,
    })
  }
}
