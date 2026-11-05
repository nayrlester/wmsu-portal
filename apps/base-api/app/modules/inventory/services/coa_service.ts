import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import CoaDocument from '#modules/inventory/models/coa_document'
import CoaDocumentLine from '#modules/inventory/models/coa_document_line'
import PropertyLedgerEntry from '#modules/inventory/models/property_ledger_entry'
import Asset from '#modules/inventory/models/asset'
import { AuditAction, CoaFormType } from '#modules/inventory/domain/enums/index'
import { auditLogService } from '#modules/inventory/services/audit_log_service'

function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return ''
  const keys = Object.keys(rows[0])
  const escape = (v: unknown) => {
    const s = v == null ? '' : String(v)
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s
  }
  return [keys.join(','), ...rows.map((r) => keys.map((k) => escape(r[k])).join(','))].join('\n')
}

function buildPrintableHtml(doc: CoaDocument): string {
  const lines = (doc.lines ?? [])
    .map(
      (l, i) =>
        `<tr><td>${i + 1}</td><td>${l.description}</td><td>${l.propertyNumber ?? ''}</td><td>${l.quantity}</td><td>${l.unitCost ?? ''}</td><td>${l.totalCost ?? ''}</td><td>${l.condition ?? ''}</td></tr>`
    )
    .join('')
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${doc.formType} ${doc.documentNo}</title>
<style>body{font-family:Georgia,serif;margin:2rem}table{border-collapse:collapse;width:100%}th,td{border:1px solid #333;padding:.4rem;font-size:12px}h1{font-size:1.4rem}</style>
</head><body>
<h1>${doc.formType} — ${doc.documentNo}</h1>
<p>Date: ${doc.documentDate} | Status: ${doc.status}</p>
<p>Custodian: ${doc.custodianName ?? doc.custodianExternalId ?? '—'}</p>
<table><thead><tr><th>#</th><th>Description</th><th>Property No</th><th>Qty</th><th>Unit Cost</th><th>Total</th><th>Condition</th></tr></thead>
<tbody>${lines}</tbody></table>
</body></html>`
}

/** Minimal PDF (text stream) using only Node builtins — viewers that accept PDF 1.1 text streams. */
function buildSimplePdf(text: string): Buffer {
  const escaped = text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
  const lines = escaped.split('\n')
  let content = 'BT /F1 10 Tf 50 750 Td 14 TL\n'
  for (const line of lines.slice(0, 60)) {
    content += `(${line}) Tj T*\n`
  }
  content += 'ET'
  const objects: string[] = []
  objects.push('1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj')
  objects.push('2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj')
  objects.push(
    '3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>endobj'
  )
  objects.push(`4 0 obj<< /Length ${Buffer.byteLength(content)} >>stream\n${content}\nendstream endobj`)
  objects.push('5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj')

  let pdf = '%PDF-1.4\n'
  const offsets: number[] = [0]
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf))
    pdf += obj + '\n'
  }
  const xrefPos = Buffer.byteLength(pdf)
  pdf += `xref\n0 ${objects.length + 1}\n`
  pdf += '0000000000 65535 f \n'
  for (let i = 1; i < offsets.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`
  }
  pdf += `trailer<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`
  return Buffer.from(pdf)
}

export class CoaService {
  async list(orgId: string, page = 1, limit = 25, formType?: string, status?: string) {
    const q = CoaDocument.query()
      .where('organizationId', orgId)
      .preload('lines')
      .preload('office')
      .preload('asset')
    if (formType) q.where('formType', formType)
    if (status) q.where('status', status)
    return q.orderBy('createdAt', 'desc').paginate(page, limit)
  }

  async getById(orgId: string, id: string) {
    return CoaDocument.query()
      .where('organizationId', orgId)
      .where('id', id)
      .preload('lines')
      .preload('office')
      .preload('asset')
      .preload('preparer')
      .preload('approver')
      .firstOrFail()
  }

  async create(orgId: string, data: Record<string, any>, userId: string) {
    if (!Object.values(CoaFormType).includes(data.formType)) {
      throw new Error(`Invalid form type: ${data.formType}`)
    }

    return db.transaction(async (trx) => {
      let documentNo = data.documentNo
      if (!documentNo) {
        const count = await CoaDocument.query({ client: trx })
          .where('organizationId', orgId)
          .where('formType', data.formType)
          .count('* as total')
        const seq = Number(count[0].$extras.total ?? 0) + 1
        documentNo = `${data.formType}-${DateTime.now().toFormat('yyyy')}-${String(seq).padStart(4, '0')}`
      }

      const doc = await CoaDocument.create(
        {
          organizationId: orgId,
          formType: data.formType,
          documentNo,
          status: 'draft',
          assetId: data.assetId ?? null,
          assignmentId: data.assignmentId ?? null,
          custodianUserId: data.custodianUserId ?? null,
          custodianName: data.custodianName ?? null,
          custodianExternalId: data.custodianExternalId ?? null,
          officeId: data.officeId ?? null,
          documentDate: data.documentDate,
          payload: data.payload ?? {},
          preparedBy: userId,
        },
        { client: trx }
      )

      for (const line of data.lines) {
        const qty = line.quantity ?? 1
        const unitCost = line.unitCost ?? null
        await CoaDocumentLine.create(
          {
            documentId: doc.id,
            assetId: line.assetId ?? null,
            itemId: line.itemId ?? null,
            description: line.description,
            propertyNumber: line.propertyNumber ?? null,
            quantity: qty,
            uom: line.uom ?? null,
            unitCost,
            totalCost: line.totalCost ?? (unitCost != null ? unitCost * qty : null),
            condition: line.condition ?? null,
            metadata: line.metadata ?? null,
          },
          { client: trx }
        )
      }

      await auditLogService.log({
        organizationId: orgId,
        actorUserId: userId,
        action: AuditAction.COA_CREATE,
        entityType: 'coa_document',
        entityId: doc.id,
        metadata: { formType: data.formType, documentNo },
      })

      await doc.load('lines')
      return doc
    })
  }

  async update(orgId: string, id: string, data: Record<string, any>, userId: string) {
    const doc = await this.getById(orgId, id)
    if (doc.status !== 'draft') throw new Error('Only draft COA documents can be updated')

    doc.merge({
      custodianUserId: data.custodianUserId !== undefined ? data.custodianUserId : doc.custodianUserId,
      custodianName: data.custodianName !== undefined ? data.custodianName : doc.custodianName,
      custodianExternalId:
        data.custodianExternalId !== undefined ? data.custodianExternalId : doc.custodianExternalId,
      officeId: data.officeId !== undefined ? data.officeId : doc.officeId,
      documentDate: data.documentDate ?? doc.documentDate,
      payload: data.payload ?? doc.payload,
    })
    await doc.save()

    if (data.lines) {
      await CoaDocumentLine.query().where('documentId', doc.id).delete()
      for (const line of data.lines) {
        const qty = line.quantity ?? 1
        const unitCost = line.unitCost ?? null
        await CoaDocumentLine.create({
          documentId: doc.id,
          assetId: line.assetId ?? null,
          itemId: line.itemId ?? null,
          description: line.description,
          propertyNumber: line.propertyNumber ?? null,
          quantity: qty,
          uom: line.uom ?? null,
          unitCost,
          totalCost: line.totalCost ?? (unitCost != null ? unitCost * qty : null),
          condition: line.condition ?? null,
          metadata: line.metadata ?? null,
        })
      }
    }

    await auditLogService.log({
      organizationId: orgId,
      actorUserId: userId,
      action: AuditAction.COA_UPDATE,
      entityType: 'coa_document',
      entityId: doc.id,
    })

    return this.getById(orgId, id)
  }

  async approve(orgId: string, id: string, userId: string) {
    const doc = await this.getById(orgId, id)
    if (doc.status !== 'draft') throw new Error('Only draft COA documents can be approved')

    doc.status = 'approved'
    doc.approvedBy = userId
    doc.approvedAt = DateTime.now()
    await doc.save()

    // Property ledger for asset-linked COA forms
    if (doc.assetId && ['PAR', 'ICS', 'IIRUP', 'WMR'].includes(doc.formType)) {
      const asset = await Asset.find(doc.assetId)
      const cost = Number(asset?.purchaseCost ?? 0)
      const last = await PropertyLedgerEntry.query()
        .where('organizationId', orgId)
        .where('assetId', doc.assetId)
        .orderBy('occurredAt', 'desc')
        .first()
      const bal = Number(last?.balanceAfter ?? cost)
      const isOut = ['IIRUP', 'WMR'].includes(doc.formType)
      await PropertyLedgerEntry.create({
        organizationId: orgId,
        assetId: doc.assetId,
        entryType: doc.formType.toLowerCase(),
        reference: doc.documentNo,
        debit: isOut ? 0 : cost,
        credit: isOut ? cost : 0,
        balanceAfter: isOut ? Math.max(0, bal - cost) : bal,
        narrative: `${doc.formType} ${doc.documentNo} approved`,
        coaDocumentId: doc.id,
        createdBy: userId,
        occurredAt: DateTime.now(),
      })
    }

    await auditLogService.log({
      organizationId: orgId,
      actorUserId: userId,
      action: AuditAction.COA_APPROVE,
      entityType: 'coa_document',
      entityId: doc.id,
    })

    return this.getById(orgId, id)
  }

  async export(orgId: string, id: string, format: 'pdf' | 'csv' | 'html' = 'pdf') {
    const doc = await this.getById(orgId, id)
    const html = buildPrintableHtml(doc)

    if (format === 'csv') {
      const rows = (doc.lines ?? []).map((l) => ({
        documentNo: doc.documentNo,
        formType: doc.formType,
        description: l.description,
        propertyNumber: l.propertyNumber,
        quantity: l.quantity,
        unitCost: l.unitCost,
        totalCost: l.totalCost,
        condition: l.condition,
      }))
      return { contentType: 'text/csv', body: toCsv(rows), filename: `${doc.documentNo}.csv` }
    }

    if (format === 'html') {
      return { contentType: 'text/html', body: html, filename: `${doc.documentNo}.html` }
    }

    const text = [
      `${doc.formType} ${doc.documentNo}`,
      `Date: ${doc.documentDate}`,
      `Status: ${doc.status}`,
      `Custodian: ${doc.custodianName ?? doc.custodianExternalId ?? ''}`,
      '',
      ...(doc.lines ?? []).map(
        (l, i) =>
          `${i + 1}. ${l.description} | Prop: ${l.propertyNumber ?? '-'} | Qty: ${l.quantity} | Cost: ${l.totalCost ?? '-'}`
      ),
    ].join('\n')

    return {
      contentType: 'application/pdf',
      body: buildSimplePdf(text),
      filename: `${doc.documentNo}.pdf`,
      html,
    }
  }
}

export const coaService = new CoaService()
