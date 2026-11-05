import { DateTime } from 'luxon'
import { Exception } from '@adonisjs/core/exceptions'
import db from '@adonisjs/lucid/services/db'
import {
  AuditAction,
  DocumentPriority,
  DocumentSourceType,
  DocumentStatus,
  DocumentVisibility,
  ReceivingChannel,
  ReceivingReceiptStatus,
  RecordsLifecycleStatus,
  DocumentConfidentiality,
} from '#modules/documents/domain/enums/index'
import { tenantContext } from '#modules/documents/domain/tenant_context'
import { nextRecordNumber } from '#modules/documents/domain/records/record_number'
import ReceivingReceipt from '#modules/documents/models/receiving_receipt'
import Document from '#modules/documents/models/document'
import User from '#modules/documents/models/user'
import { auditService } from '#modules/documents/services/audit_service'
import { trackingNumberService } from '#modules/documents/services/tracking_number_service'
import { documentRepository } from '#infrastructure/repositories/document_repository'

export class ReceivingValidationException extends Exception {
  static status = 422
  static code = 'E_RECEIVING_VALIDATION'

  constructor(message: string) {
    super(message, { status: 422, code: 'E_RECEIVING_VALIDATION' })
  }
}

export class ReceivingNotFoundException extends Exception {
  static status = 404
  static code = 'E_RECEIVING_NOT_FOUND'

  constructor(message = 'Receiving receipt not found') {
    super(message, { status: 404, code: 'E_RECEIVING_NOT_FOUND' })
  }
}

type CreateReceiptInput = {
  title: string
  channel: string
  receivedAt?: string
  senderName?: string
  description?: string
  originatingOfficeId?: string
  receivingOfficeId?: string
  physicalBoxId?: string
  physicalFolderId?: string
  acknowledgmentNotes?: string
}

export class ReceivingService {
  async list(filters: {
    channel?: string
    status?: string
    date?: string
    page?: number
    limit?: number
  }) {
    const tenantId = tenantContext.requireTenantId()
    const page = Math.max(filters.page ?? 1, 1)
    const limit = Math.min(Math.max(filters.limit ?? 20, 1), 100)

    const query = ReceivingReceipt.query()
      .where('tenant_id', tenantId)
      .preload('receivedBy')
      .preload('originatingOffice')
      .preload('receivingOffice')
      .preload('document')
      .orderBy('received_at', 'desc')

    if (filters.channel) query.where('channel', filters.channel)
    if (filters.status) query.where('status', filters.status)
    if (filters.date) {
      const day = DateTime.fromISO(filters.date)
      if (!day.isValid) throw new ReceivingValidationException('Invalid date filter')
      query
        .where('received_at', '>=', day.startOf('day').toSQL()!)
        .where('received_at', '<=', day.endOf('day').toSQL()!)
    }

    const paginator = await query.paginate(page, limit)
    return {
      data: paginator.all().map((r) => this.serialize(r)),
      meta: paginator.getMeta(),
    }
  }

  async show(id: string) {
    const receipt = await this.findOrFail(id)
    await this.preload(receipt)
    return this.serialize(receipt, true)
  }

  async create(input: CreateReceiptInput, actor: User) {
    const tenantId = tenantContext.requireTenantId()
    const receivedAt = input.receivedAt
      ? DateTime.fromISO(input.receivedAt)
      : DateTime.now()
    if (!receivedAt.isValid) {
      throw new ReceivingValidationException('Invalid receivedAt')
    }

    const receipt = await db.transaction(async (trx) => {
      const receiptNumber = await nextRecordNumber(tenantId, 'receiving_receipt', 'RCP', trx)
      return ReceivingReceipt.create(
        {
          tenantId,
          receiptNumber,
          channel: input.channel,
          status: ReceivingReceiptStatus.LOGGED,
          receivedAt,
          receivedById: actor.id,
          originatingOfficeId: input.originatingOfficeId ?? null,
          receivingOfficeId: input.receivingOfficeId ?? null,
          senderName: input.senderName ?? null,
          title: input.title,
          description: input.description ?? null,
          physicalBoxId: input.physicalBoxId ?? null,
          physicalFolderId: input.physicalFolderId ?? null,
          documentId: null,
          acknowledgmentNotes: input.acknowledgmentNotes ?? null,
        },
        { client: trx }
      )
    })

    await auditService.log({
      tenantId,
      userId: actor.id,
      action: AuditAction.RECEIVING_RECEIPT_CREATE,
      entityType: 'receiving_receipt',
      entityId: receipt.id,
      newValues: { receiptNumber: receipt.receiptNumber, channel: receipt.channel },
    })

    await this.preload(receipt)
    return this.serialize(receipt, true)
  }

  async register(
    id: string,
    input: { documentId?: string; createDocument?: boolean },
    actor: User
  ) {
    const tenantId = tenantContext.requireTenantId()
    const receipt = await this.findOrFail(id)
    if (receipt.status === ReceivingReceiptStatus.CANCELLED) {
      throw new ReceivingValidationException('Cannot register a cancelled receipt')
    }
    if (receipt.status === ReceivingReceiptStatus.REGISTERED && receipt.documentId) {
      throw new ReceivingValidationException('Receipt already registered')
    }

    let documentId = input.documentId ?? null
    if (!documentId && input.createDocument !== false) {
      const trackingNumber = await trackingNumberService.generate(tenantId)
      const document = await documentRepository.create({
        tenantId,
        trackingNumber,
        title: receipt.title,
        description: receipt.description,
        status: DocumentStatus.RECEIVED,
        priority: DocumentPriority.MEDIUM,
        documentTypeId: null,
        departmentId: receipt.receivingOfficeId,
        assignedToId: null,
        createdById: actor.id,
        metadata: { receivingReceiptId: receipt.id },
        contentHtml: null,
        sourceType: DocumentSourceType.UPLOAD,
        visibility: DocumentVisibility.PRIVATE,
        originatingOfficeId: receipt.originatingOfficeId,
        receivingOfficeId: receipt.receivingOfficeId,
        documentDate: receipt.receivedAt.startOf('day'),
        receivedAt: receipt.receivedAt,
        subjectKeywords: null,
        confidentiality: DocumentConfidentiality.INTERNAL,
        napCategory: null,
        retentionScheduleId: null,
        lifecycleStatus: RecordsLifecycleStatus.ACTIVE,
        retentionDueAt: null,
        dispositionAction: null,
        physicalBoxId: receipt.physicalBoxId,
        physicalFolderId: receipt.physicalFolderId,
        receivingChannel: receipt.channel,
        receiptNumber: receipt.receiptNumber,
        ocrQaStatus: null,
        indexingChecklist: null,
      })
      documentId = document.id
    } else if (documentId) {
      const document = await Document.query()
        .where('tenant_id', tenantId)
        .whereNull('deleted_at')
        .where('id', documentId)
        .first()
      if (!document) throw new ReceivingValidationException('Document not found')
      document.receivingChannel = receipt.channel
      document.receiptNumber = receipt.receiptNumber
      document.physicalBoxId = receipt.physicalBoxId ?? document.physicalBoxId
      document.physicalFolderId = receipt.physicalFolderId ?? document.physicalFolderId
      document.receivedAt = receipt.receivedAt
      document.originatingOfficeId = receipt.originatingOfficeId ?? document.originatingOfficeId
      document.receivingOfficeId = receipt.receivingOfficeId ?? document.receivingOfficeId
      await document.save()
    } else {
      throw new ReceivingValidationException('Provide documentId or allow createDocument')
    }

    receipt.documentId = documentId
    receipt.status = ReceivingReceiptStatus.REGISTERED
    await receipt.save()

    await auditService.log({
      tenantId,
      userId: actor.id,
      action: AuditAction.RECEIVING_RECEIPT_REGISTER,
      entityType: 'receiving_receipt',
      entityId: receipt.id,
      newValues: { documentId, status: receipt.status },
    })

    await this.preload(receipt)
    return this.serialize(receipt, true)
  }

  /** Printable acknowledgment payload for UI / PDF print. */
  async acknowledgment(id: string) {
    const receipt = await this.findOrFail(id)
    await this.preload(receipt)
    return {
      receiptNumber: receipt.receiptNumber,
      title: receipt.title,
      channel: receipt.channel,
      status: receipt.status,
      receivedAt: receipt.receivedAt.toISO(),
      senderName: receipt.senderName,
      description: receipt.description,
      physicalBoxId: receipt.physicalBoxId,
      physicalFolderId: receipt.physicalFolderId,
      acknowledgmentNotes: receipt.acknowledgmentNotes,
      receivedBy: receipt.receivedBy
        ? {
            fullName: receipt.receivedBy.fullName,
            email: receipt.receivedBy.email,
          }
        : null,
      originatingOffice: receipt.originatingOffice?.name ?? null,
      receivingOffice: receipt.receivingOffice?.name ?? null,
      document: receipt.document
        ? {
            trackingNumber: receipt.document.trackingNumber,
            title: receipt.document.title,
          }
        : null,
      printedAt: DateTime.now().toISO(),
    }
  }

  serialize(receipt: ReceivingReceipt, detail = false) {
    return {
      id: receipt.id,
      receiptNumber: receipt.receiptNumber,
      channel: receipt.channel,
      status: receipt.status,
      title: receipt.title,
      description: receipt.description,
      senderName: receipt.senderName,
      receivedAt: receipt.receivedAt.toISO(),
      physicalBoxId: receipt.physicalBoxId,
      physicalFolderId: receipt.physicalFolderId,
      acknowledgmentNotes: receipt.acknowledgmentNotes,
      createdAt: receipt.createdAt.toISO(),
      receivedBy: receipt.receivedBy
        ? {
            id: receipt.receivedBy.id,
            fullName: receipt.receivedBy.fullName,
            email: receipt.receivedBy.email,
          }
        : null,
      originatingOffice: receipt.originatingOffice
        ? { id: receipt.originatingOffice.id, name: receipt.originatingOffice.name }
        : null,
      receivingOffice: receipt.receivingOffice
        ? { id: receipt.receivingOffice.id, name: receipt.receivingOffice.name }
        : null,
      document: receipt.document
        ? {
            id: receipt.document.id,
            title: receipt.document.title,
            trackingNumber: receipt.document.trackingNumber,
          }
        : receipt.documentId
          ? { id: receipt.documentId }
          : null,
      acknowledgment: detail
        ? {
            heading: 'Official Receiving Acknowledgment',
            body: `This acknowledges receipt of "${receipt.title}" via ${receipt.channel.replaceAll('_', ' ')} under ${receipt.receiptNumber}.`,
          }
        : undefined,
    }
  }

  private async findOrFail(id: string) {
    const tenantId = tenantContext.requireTenantId()
    const receipt = await ReceivingReceipt.query()
      .where('tenant_id', tenantId)
      .where('id', id)
      .first()
    if (!receipt) throw new ReceivingNotFoundException()
    return receipt
  }

  private async preload(receipt: ReceivingReceipt) {
    await receipt.load('receivedBy')
    await receipt.load('originatingOffice')
    await receipt.load('receivingOffice')
    await receipt.load('document')
  }
}

export const receivingService = new ReceivingService()
