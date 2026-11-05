import { createHash } from 'node:crypto'
import { DateTime } from 'luxon'
import { Exception } from '@adonisjs/core/exceptions'
import db from '@adonisjs/lucid/services/db'
import {
  AuditAction,
  DigitizationBatchStatus,
  DigitizationItemStatus,
  OcrQaStatus,
} from '#modules/documents/domain/enums/index'
import { tenantContext } from '#modules/documents/domain/tenant_context'
import { nextRecordNumber } from '#modules/documents/domain/records/record_number'
import {
  DEFAULT_INDEXING_CHECKLIST,
  mergeChecklist,
} from '#modules/documents/domain/records/indexing_checklist'
import { imagesToPdf, ensurePdfAOriented, PDFA_PROFILE } from '#modules/documents/domain/records/scan_pdf'
import DigitizationBatch from '#modules/documents/models/digitization_batch'
import DigitizationBatchItem from '#modules/documents/models/digitization_batch_item'
import Document from '#modules/documents/models/document'
import DocumentFile from '#modules/documents/models/document_file'
import User from '#modules/documents/models/user'
import { auditService } from '#modules/documents/services/audit_service'
import { documentService } from '#modules/documents/services/document_service'
import { documentFileService } from '#modules/documents/services/document_file_service'
import { documentIntelligenceService } from '#modules/documents/services/document_intelligence_service'
import { IntelligenceTask } from '#modules/documents/domain/intelligence/intelligence_types'
import { documentVersionRepository } from '#infrastructure/repositories/document_version_repository'

export class DigitizationValidationException extends Exception {
  static status = 422
  static code = 'E_DIGITIZATION_VALIDATION'
  constructor(message: string) {
    super(message, { status: 422, code: 'E_DIGITIZATION_VALIDATION' })
  }
}

export class DigitizationNotFoundException extends Exception {
  static status = 404
  static code = 'E_DIGITIZATION_NOT_FOUND'
  constructor(message = 'Digitization batch not found') {
    super(message, { status: 404, code: 'E_DIGITIZATION_NOT_FOUND' })
  }
}

export class DigitizationService {
  async list(filters: { status?: string; page?: number; limit?: number }) {
    const tenantId = tenantContext.requireTenantId()
    const page = Math.max(filters.page ?? 1, 1)
    const limit = Math.min(Math.max(filters.limit ?? 20, 1), 100)
    const query = DigitizationBatch.query()
      .where('tenant_id', tenantId)
      .preload('createdBy')
      .preload('items')
      .orderBy('created_at', 'desc')
    if (filters.status) query.where('status', filters.status)
    const paginator = await query.paginate(page, limit)
    return { data: paginator.all().map((b) => this.serializeBatch(b)), meta: paginator.getMeta() }
  }

  async show(id: string) {
    const batch = await this.findBatchOrFail(id)
    await batch.load('createdBy')
    await batch.load('items', (q) =>
      q.preload('document').preload('qaReviewedBy').orderBy('created_at', 'asc')
    )
    return this.serializeBatch(batch, true)
  }

  async create(input: { title: string; notes?: string }, actor: User) {
    const tenantId = tenantContext.requireTenantId()
    const batch = await db.transaction(async (trx) => {
      const batchNumber = await nextRecordNumber(tenantId, 'digitization_batch', 'DIG', trx)
      return DigitizationBatch.create(
        {
          tenantId,
          batchNumber,
          title: input.title,
          notes: input.notes ?? null,
          status: DigitizationBatchStatus.OPEN,
          createdById: actor.id,
          completedAt: null,
        },
        { client: trx }
      )
    })
    await auditService.log({
      tenantId,
      userId: actor.id,
      action: AuditAction.DIGITIZATION_BATCH_CREATE,
      entityType: 'digitization_batch',
      entityId: batch.id,
      newValues: { batchNumber: batch.batchNumber },
    })
    await batch.load('createdBy')
    await batch.load('items')
    return this.serializeBatch(batch, true)
  }

  async addItem(
    batchId: string,
    input: {
      label: string
      documentId?: string
      physicalBoxId?: string
      physicalFolderId?: string
    },
    actor: User
  ) {
    const tenantId = tenantContext.requireTenantId()
    const batch = await this.findBatchOrFail(batchId)
    if (
      batch.status === DigitizationBatchStatus.COMPLETED ||
      batch.status === DigitizationBatchStatus.CANCELLED
    ) {
      throw new DigitizationValidationException('Cannot add items to a closed batch')
    }
    let document: Document | null = null
    if (input.documentId) {
      document = await Document.query()
        .where('tenant_id', tenantId)
        .whereNull('deleted_at')
        .where('id', input.documentId)
        .first()
      if (!document) throw new DigitizationValidationException('Document not found')
    }
    const item = await DigitizationBatchItem.create({
      tenantId,
      batchId: batch.id,
      documentId: document?.id ?? null,
      label: input.label,
      status: document ? DigitizationItemStatus.QA_PENDING : DigitizationItemStatus.QUEUED,
      ocrQaStatus: OcrQaStatus.PENDING,
      indexingChecklist: DEFAULT_INDEXING_CHECKLIST.map((i) => ({ ...i })),
      physicalBoxId: input.physicalBoxId ?? document?.physicalBoxId ?? null,
      physicalFolderId: input.physicalFolderId ?? document?.physicalFolderId ?? null,
      qaNotes: null,
      qaReviewedById: null,
      qaReviewedAt: null,
      ocrConfidence: null,
      ocrJobId: null,
      contentHash: null,
      pageCount: null,
      primaryFileId: null,
    })
    if (batch.status === DigitizationBatchStatus.OPEN) {
      batch.status = DigitizationBatchStatus.PROCESSING
      await batch.save()
    }
    if (document) {
      document.ocrQaStatus = OcrQaStatus.PENDING
      if (input.physicalBoxId) document.physicalBoxId = input.physicalBoxId
      if (input.physicalFolderId) document.physicalFolderId = input.physicalFolderId
      document.indexingChecklist = item.indexingChecklist
      await document.save()
    }
    await auditService.log({
      tenantId,
      userId: actor.id,
      action: AuditAction.CREATE,
      entityType: 'digitization_batch_item',
      entityId: item.id,
      newValues: { batchId: batch.id, label: item.label },
    })
    return this.show(batch.id)
  }

  async ingestPages(
    batchId: string,
    itemId: string,
    pages: Array<{ buffer: Buffer; mimeType: string; fileName: string }>,
    actor: User
  ) {
    if (!pages.length) {
      throw new DigitizationValidationException('Upload at least one page or PDF')
    }
    const tenantId = tenantContext.requireTenantId()
    const item = await this.findItemOrFail(batchId, itemId)
    const batch = await this.findBatchOrFail(batchId)

    let pdfBuffer: Buffer
    let pageCount: number
    let pdfaOriented = true
    if (pages.length === 1 && pages[0].mimeType === 'application/pdf') {
      pdfBuffer = await ensurePdfAOriented(pages[0].buffer, { title: item.label })
      pageCount = 1
    } else {
      const imagePages = pages.filter((p) =>
        ['image/jpeg', 'image/png', 'image/jpg'].includes(p.mimeType)
      )
      if (!imagePages.length) {
        throw new DigitizationValidationException(
          'Only JPEG/PNG pages or a single PDF are supported'
        )
      }
      pdfBuffer = await imagesToPdf(
        imagePages.map((p) => ({
          buffer: p.buffer,
          mimeType: p.mimeType === 'image/jpg' ? 'image/jpeg' : p.mimeType,
        })),
        { title: item.label }
      )
      pageCount = imagePages.length
    }

    const contentHash = createHash('sha256').update(pdfBuffer).digest('hex')
    const duplicate = await DocumentFile.query()
      .where('tenant_id', tenantId)
      .where('checksum', contentHash)
      .whereNull('deleted_at')
      .first()
    if (duplicate && duplicate.documentId !== item.documentId) {
      throw new DigitizationValidationException(
        `Duplicate scan detected (matches existing file on document ${duplicate.documentId})`
      )
    }

    let document: Document
    if (item.documentId) {
      const existing = await Document.query()
        .where('tenant_id', tenantId)
        .where('id', item.documentId)
        .first()
      if (!existing) throw new DigitizationValidationException('Linked document not found')
      document = existing
    } else {
      document = await documentService.create({ title: item.label }, actor.id)
      item.documentId = document.id
    }

    const versions = await documentVersionRepository.listAllByDocument(document.id)
    const version = versions[0]
    if (!version) {
      throw new DigitizationValidationException('Document has no version to attach file')
    }

    const safeName = `${(item.label.replace(/[^\w.-]+/g, '_') || 'scan')}.pdf`
    const file = await documentFileService.uploadFromBuffer(
      document.id,
      version.id,
      pdfBuffer,
      safeName,
      'application/pdf',
      actor.id,
      {
        source: 'digitization_ingest',
        batchId: batch.id,
        itemId: item.id,
        contentHash,
        pdfaProfile: PDFA_PROFILE,
        pdfaOriented,
      }
    )

    item.contentHash = contentHash
    item.pageCount = pageCount
    item.primaryFileId = file.id
    item.status = DigitizationItemStatus.OCR_RUNNING
    item.ocrQaStatus = OcrQaStatus.PENDING
    await item.save()

    document.ocrQaStatus = OcrQaStatus.PENDING
    if (item.physicalBoxId) document.physicalBoxId = item.physicalBoxId
    if (item.physicalFolderId) document.physicalFolderId = item.physicalFolderId
    await document.save()

    if (batch.status === DigitizationBatchStatus.OPEN) {
      batch.status = DigitizationBatchStatus.PROCESSING
      await batch.save()
    }

    await auditService.log({
      tenantId,
      userId: actor.id,
      action: AuditAction.DIGITIZATION_INGEST,
      entityType: 'digitization_batch_item',
      entityId: item.id,
      newValues: {
        documentId: document.id,
        fileId: file.id,
        pageCount,
        contentHash,
        pdfaProfile: PDFA_PROFILE,
      },
    })

    return this.runOcr(batchId, itemId, actor)
  }

  async runOcr(batchId: string, itemId: string, actor: User) {
    const tenantId = tenantContext.requireTenantId()
    const item = await this.findItemOrFail(batchId, itemId)
    if (!item.documentId) {
      throw new DigitizationValidationException('Ingest scanned pages before running OCR')
    }
    item.status = DigitizationItemStatus.OCR_RUNNING
    await item.save()

    let fileId = item.primaryFileId
    if (!fileId) {
      const files = await DocumentFile.query()
        .where('tenant_id', tenantId)
        .where('document_id', item.documentId)
        .whereNull('deleted_at')
        .orderBy('created_at', 'desc')
      fileId = files[0]?.id ?? null
    }
    if (!fileId) {
      throw new DigitizationValidationException('No file available for OCR — ingest pages first')
    }

    const job = await documentIntelligenceService.enqueueAnalysis({
      tenantId,
      documentId: item.documentId,
      fileId,
      userId: actor.id,
      tasks: [
        IntelligenceTask.OCR,
        IntelligenceTask.CLASSIFY,
        IntelligenceTask.EXTRACT_METADATA,
        IntelligenceTask.SUMMARIZE,
      ],
    })

    const completed = await documentIntelligenceService.getJob(job.id)
    const result = completed.result as {
      ocr?: { confidence?: number }
      classification?: { confidence?: number }
    } | null
    const confidence =
      typeof result?.ocr?.confidence === 'number'
        ? result.ocr.confidence
        : typeof result?.classification?.confidence === 'number'
          ? result.classification.confidence
          : completed.status === 'completed'
            ? 0.85
            : null

    item.ocrJobId = job.id
    item.ocrConfidence = confidence
    item.primaryFileId = fileId
    item.status =
      completed.status === 'failed'
        ? DigitizationItemStatus.QA_FAILED
        : DigitizationItemStatus.QA_PENDING
    item.ocrQaStatus =
      completed.status === 'failed' ? OcrQaStatus.FAILED : OcrQaStatus.PENDING
    await item.save()

    const document = await Document.query().where('id', item.documentId).first()
    if (document) {
      document.ocrQaStatus = item.ocrQaStatus
      await document.save()
    }

    await auditService.log({
      tenantId,
      userId: actor.id,
      action: AuditAction.DIGITIZATION_OCR,
      entityType: 'digitization_batch_item',
      entityId: item.id,
      newValues: { jobId: job.id, confidence, status: item.status },
    })

    return this.show(batchId)
  }

  async markOcrRunning(batchId: string, itemId: string, actor: User) {
    return this.runOcr(batchId, itemId, actor)
  }

  async submitQa(
    batchId: string,
    itemId: string,
    input: {
      ocrQaStatus: string
      qaNotes?: string
      physicalBoxId?: string
      physicalFolderId?: string
      checklist?: Array<{ key: string; done: boolean }>
    },
    actor: User
  ) {
    const tenantId = tenantContext.requireTenantId()
    const item = await this.findItemOrFail(batchId, itemId)
    const checklist = mergeChecklist(input.checklist ?? item.indexingChecklist)

    if (input.ocrQaStatus === OcrQaStatus.PASSED) {
      const incomplete = checklist.filter((c) => !c.done)
      if (incomplete.length) {
        throw new DigitizationValidationException(
          `Complete indexing checklist before QA pass (${incomplete.map((i) => i.key).join(', ')})`
        )
      }
      if (!input.physicalBoxId && !item.physicalBoxId) {
        throw new DigitizationValidationException('physicalBoxId is required to pass QA')
      }
      if (item.ocrConfidence !== null && item.ocrConfidence < 0.6) {
        throw new DigitizationValidationException(
          `OCR confidence is low (${Math.round(item.ocrConfidence * 100)}%). Re-scan or mark QA failed.`
        )
      }
    }

    item.ocrQaStatus = input.ocrQaStatus
    item.qaNotes = input.qaNotes ?? null
    item.indexingChecklist = checklist
    item.physicalBoxId = input.physicalBoxId ?? item.physicalBoxId
    item.physicalFolderId = input.physicalFolderId ?? item.physicalFolderId
    item.qaReviewedById = actor.id
    item.qaReviewedAt = DateTime.now()
    item.status =
      input.ocrQaStatus === OcrQaStatus.PASSED
        ? DigitizationItemStatus.QA_PASSED
        : input.ocrQaStatus === OcrQaStatus.FAILED
          ? DigitizationItemStatus.QA_FAILED
          : DigitizationItemStatus.QA_PENDING
    await item.save()

    if (item.documentId) {
      const document = await Document.query()
        .where('tenant_id', tenantId)
        .where('id', item.documentId)
        .first()
      if (document) {
        document.ocrQaStatus = item.ocrQaStatus
        document.indexingChecklist = checklist
        document.physicalBoxId = item.physicalBoxId
        document.physicalFolderId = item.physicalFolderId
        await document.save()
      }
      if (input.ocrQaStatus === OcrQaStatus.PASSED) {
        item.status = DigitizationItemStatus.LINKED
        await item.save()
      }
    }

    await auditService.log({
      tenantId,
      userId: actor.id,
      action: AuditAction.DIGITIZATION_ITEM_QA,
      entityType: 'digitization_batch_item',
      entityId: item.id,
      newValues: { ocrQaStatus: item.ocrQaStatus, status: item.status },
    })
    return this.show(batchId)
  }

  async complete(batchId: string, actor: User) {
    const batch = await this.findBatchOrFail(batchId)
    await batch.load('items')
    const blocking = batch.items.filter(
      (i) =>
        i.status === DigitizationItemStatus.QUEUED ||
        i.status === DigitizationItemStatus.OCR_RUNNING ||
        i.status === DigitizationItemStatus.QA_PENDING
    )
    if (blocking.length) {
      throw new DigitizationValidationException(
        `Cannot complete batch while ${blocking.length} item(s) still need OCR/QA`
      )
    }
    batch.status = DigitizationBatchStatus.COMPLETED
    batch.completedAt = DateTime.now()
    await batch.save()
    await auditService.log({
      tenantId: batch.tenantId,
      userId: actor.id,
      action: AuditAction.UPDATE,
      entityType: 'digitization_batch',
      entityId: batch.id,
      newValues: { status: batch.status },
    })
    return this.show(batch.id)
  }

  serializeBatch(batch: DigitizationBatch, includeItems = false) {
    const items = batch.items ?? []
    const board = {
      queued: items.filter((i) => i.status === DigitizationItemStatus.QUEUED).length,
      ocrRunning: items.filter((i) => i.status === DigitizationItemStatus.OCR_RUNNING).length,
      qaPending: items.filter((i) => i.status === DigitizationItemStatus.QA_PENDING).length,
      qaPassed: items.filter(
        (i) =>
          i.status === DigitizationItemStatus.QA_PASSED ||
          i.status === DigitizationItemStatus.LINKED
      ).length,
      qaFailed: items.filter((i) => i.status === DigitizationItemStatus.QA_FAILED).length,
      total: items.length,
    }
    return {
      id: batch.id,
      batchNumber: batch.batchNumber,
      title: batch.title,
      status: batch.status,
      notes: batch.notes,
      completedAt: batch.completedAt?.toISO() ?? null,
      createdAt: batch.createdAt.toISO(),
      createdBy: batch.createdBy
        ? {
            id: batch.createdBy.id,
            fullName: batch.createdBy.fullName,
            email: batch.createdBy.email,
          }
        : null,
      board,
      items: includeItems
        ? items.map((item) => ({
            id: item.id,
            label: item.label,
            status: item.status,
            ocrQaStatus: item.ocrQaStatus,
            ocrConfidence: item.ocrConfidence,
            ocrJobId: item.ocrJobId,
            pageCount: item.pageCount,
            contentHash: item.contentHash,
            primaryFileId: item.primaryFileId,
            indexingChecklist: item.indexingChecklist,
            physicalBoxId: item.physicalBoxId,
            physicalFolderId: item.physicalFolderId,
            qaNotes: item.qaNotes,
            qaReviewedAt: item.qaReviewedAt?.toISO() ?? null,
            document: item.document
              ? {
                  id: item.document.id,
                  title: item.document.title,
                  trackingNumber: item.document.trackingNumber,
                }
              : item.documentId
                ? { id: item.documentId }
                : null,
          }))
        : undefined,
    }
  }

  private async findBatchOrFail(id: string) {
    const tenantId = tenantContext.requireTenantId()
    const batch = await DigitizationBatch.query()
      .where('tenant_id', tenantId)
      .where('id', id)
      .first()
    if (!batch) throw new DigitizationNotFoundException()
    return batch
  }

  private async findItemOrFail(batchId: string, itemId: string) {
    const tenantId = tenantContext.requireTenantId()
    const item = await DigitizationBatchItem.query()
      .where('tenant_id', tenantId)
      .where('batch_id', batchId)
      .where('id', itemId)
      .first()
    if (!item) throw new DigitizationNotFoundException('Digitization item not found')
    return item
  }
}

export const digitizationService = new DigitizationService()
