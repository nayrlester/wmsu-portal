import type { HttpContext } from '@adonisjs/core/http'
import { reportService } from '#modules/records/services/report_service'

export default class ReportsController {
  async stockInventory({ auth, request, response }: HttpContext) {
    const rows = await reportService.stockInventory(
      auth.user!.organizationId,
      request.input('warehouseId')
    )
    await reportService.logExport(auth.user!.organizationId, auth.user!.id, 'stock-inventory')
    if (String(request.input('format', '')).toLowerCase() === 'csv') {
      response.header('Content-Type', 'text/csv')
      response.header('Content-Disposition', 'attachment; filename="stock-inventory.csv"')
      return response.send(reportService.formatCsv(rows as any))
    }
    return response.ok({ data: rows })
  }

  async propertyLedger({ auth, request, response }: HttpContext) {
    const rows = await reportService.propertyLedger(
      auth.user!.organizationId,
      request.input('assetId')
    )
    await reportService.logExport(auth.user!.organizationId, auth.user!.id, 'property-ledger')
    if (String(request.input('format', '')).toLowerCase() === 'csv') {
      response.header('Content-Type', 'text/csv')
      response.header('Content-Disposition', 'attachment; filename="property-ledger.csv"')
      return response.send(reportService.formatCsv(rows as any))
    }
    return response.ok({ data: rows })
  }

  async consumption({ auth, request, response }: HttpContext) {
    const rows = await reportService.consumption(
      auth.user!.organizationId,
      request.input('from'),
      request.input('to')
    )
    await reportService.logExport(auth.user!.organizationId, auth.user!.id, 'consumption')
    if (String(request.input('format', '')).toLowerCase() === 'csv') {
      response.header('Content-Type', 'text/csv')
      response.header('Content-Disposition', 'attachment; filename="consumption.csv"')
      return response.send(reportService.formatCsv(rows as any))
    }
    return response.ok({ data: rows })
  }

  async depreciation({ auth, request, response }: HttpContext) {
    const data = await reportService.depreciation(
      auth.user!.organizationId,
      request.input('year') ? Number(request.input('year')) : undefined,
      request.input('month') ? Number(request.input('month')) : undefined
    )
    await reportService.logExport(auth.user!.organizationId, auth.user!.id, 'depreciation')
    if (String(request.input('format', '')).toLowerCase() === 'csv') {
      response.header('Content-Type', 'text/csv')
      response.header('Content-Disposition', 'attachment; filename="depreciation.csv"')
      return response.send(reportService.formatCsv(data.entries as any))
    }
    return response.ok({ data })
  }
}
