import Document from '#modules/documents/models/document'
import DigitizationBatchItem from '#modules/documents/models/digitization_batch_item'
import DocumentSlaTracking from '#modules/documents/models/document_sla_tracking'
import { tenantContext } from '#modules/documents/domain/tenant_context'

export type OpsReport = {
  generatedAt: string
  sla: {
    open: number
    breached: number
  }
  digitization: {
    itemsTotal: number
    qaPassed: number
    qaFailed: number
    avgOcrConfidence: number | null
    lowConfidenceCount: number
  }
  scan: {
    pagesIngested: number
    duplicateHashes: number
  }
}

export class OpsReportingService {
  async build(): Promise<OpsReport> {
    const tenantId = tenantContext.requireTenantId()

    const documentIds = (
      await Document.query().where('tenant_id', tenantId).whereNull('deleted_at').select('id')
    ).map((d) => d.id)

    let open = 0
    let breached = 0
    if (documentIds.length) {
      const [openRows, breachedRows] = await Promise.all([
        DocumentSlaTracking.query()
          .whereIn('document_id', documentIds)
          .where('is_breached', false)
          .count('* as total'),
        DocumentSlaTracking.query()
          .whereIn('document_id', documentIds)
          .where('is_breached', true)
          .count('* as total'),
      ])
      open = Number(openRows[0].$extras.total ?? 0)
      breached = Number(breachedRows[0].$extras.total ?? 0)
    }

    const items = await DigitizationBatchItem.query().where('tenant_id', tenantId)
    const withConfidence = items.filter((i) => typeof i.ocrConfidence === 'number')
    const avgOcrConfidence = withConfidence.length
      ? withConfidence.reduce((sum, i) => sum + (i.ocrConfidence ?? 0), 0) / withConfidence.length
      : null

    const pagesIngested = items.reduce((sum, i) => sum + (i.pageCount ?? 0), 0)
    const hashes = items.map((i) => i.contentHash).filter(Boolean) as string[]
    const uniqueHashes = new Set(hashes)

    return {
      generatedAt: new Date().toISOString(),
      sla: { open, breached },
      digitization: {
        itemsTotal: items.length,
        qaPassed: items.filter((i) => i.ocrQaStatus === 'passed' || i.status === 'linked').length,
        qaFailed: items.filter((i) => i.ocrQaStatus === 'failed').length,
        avgOcrConfidence,
        lowConfidenceCount: withConfidence.filter((i) => (i.ocrConfidence ?? 1) < 0.6).length,
      },
      scan: {
        pagesIngested,
        duplicateHashes: Math.max(0, hashes.length - uniqueHashes.size),
      },
    }
  }

  toCsv(report: OpsReport): string {
    const rows = [
      ['metric', 'value'],
      ['generated_at', report.generatedAt],
      ['sla_open', String(report.sla.open)],
      ['sla_breached', String(report.sla.breached)],
      ['digitization_items', String(report.digitization.itemsTotal)],
      ['digitization_qa_passed', String(report.digitization.qaPassed)],
      ['digitization_qa_failed', String(report.digitization.qaFailed)],
      [
        'digitization_avg_ocr_confidence',
        report.digitization.avgOcrConfidence === null
          ? ''
          : String(Math.round(report.digitization.avgOcrConfidence * 1000) / 1000),
      ],
      ['digitization_low_confidence', String(report.digitization.lowConfidenceCount)],
      ['scan_pages_ingested', String(report.scan.pagesIngested)],
      ['scan_duplicate_hashes', String(report.scan.duplicateHashes)],
    ]
    return rows.map((r) => r.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(',')).join('\n')
  }
}

export const opsReportingService = new OpsReportingService()
