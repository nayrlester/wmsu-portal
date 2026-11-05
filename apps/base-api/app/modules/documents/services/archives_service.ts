import { createHash } from 'node:crypto'
import { DateTime } from 'luxon'
import { Exception } from '@adonisjs/core/exceptions'
import db from '@adonisjs/lucid/services/db'
import {
  ArchivalTransferStatus,
  AuditAction,
  DispositionAction,
  DisposalRequestStatus,
  RecordsLifecycleStatus,
} from '#modules/documents/domain/enums/index'
import { tenantContext } from '#modules/documents/domain/tenant_context'
import { nextRecordNumber } from '#modules/documents/domain/records/record_number'
import ArchivalTransfer from '#modules/documents/models/archival_transfer'
import ArchivalTransferItem from '#modules/documents/models/archival_transfer_item'
import DisposalRequest from '#modules/documents/models/disposal_request'
import DisposalRequestItem from '#modules/documents/models/disposal_request_item'
import Document from '#modules/documents/models/document'
import User from '#modules/documents/models/user'
import { auditService } from '#modules/documents/services/audit_service'
import { recordsLifecycleService } from '#modules/documents/services/records_lifecycle_service'

export class ArchivesValidationException extends Exception {
  static status = 422
  static code = 'E_ARCHIVES_VALIDATION'

  constructor(message: string) {
    super(message, { status: 422, code: 'E_ARCHIVES_VALIDATION' })
  }
}

export class ArchivesNotFoundException extends Exception {
  static status = 404
  static code = 'E_ARCHIVES_NOT_FOUND'

  constructor(message = 'Record not found') {
    super(message, { status: 404, code: 'E_ARCHIVES_NOT_FOUND' })
  }
}

export class ArchivesService {
  async setLegalHold(
    documentId: string,
    input: { reason: string; hold: boolean },
    actor: User
  ) {
    const tenantId = tenantContext.requireTenantId()
    const document = await Document.query()
      .where('tenant_id', tenantId)
      .whereNull('deleted_at')
      .where('id', documentId)
      .first()
    if (!document) throw new ArchivesNotFoundException('Document not found')

    const previous = document.legalHold
    document.legalHold = input.hold
    document.legalHoldReason = input.hold ? input.reason : null
    document.legalHoldAt = input.hold ? DateTime.now() : null
    document.legalHoldById = input.hold ? actor.id : null
    await document.save()

    await auditService.log({
      tenantId,
      userId: actor.id,
      action: input.hold ? AuditAction.LEGAL_HOLD_SET : AuditAction.LEGAL_HOLD_RELEASE,
      entityType: 'document',
      entityId: document.id,
      oldValues: { legalHold: previous },
      newValues: { legalHold: document.legalHold, reason: document.legalHoldReason },
    })

    return {
      id: document.id,
      trackingNumber: document.trackingNumber,
      legalHold: document.legalHold,
      legalHoldReason: document.legalHoldReason,
      legalHoldAt: document.legalHoldAt?.toISO() ?? null,
    }
  }

  async createTransfer(
    input: { title: string; notes?: string; documentIds: string[] },
    actor: User
  ) {
    if (!input.documentIds.length) {
      throw new ArchivesValidationException('Select at least one document')
    }
    const tenantId = tenantContext.requireTenantId()

    const docs = await Document.query()
      .where('tenant_id', tenantId)
      .whereNull('deleted_at')
      .whereIn('id', input.documentIds)
    if (docs.length !== input.documentIds.length) {
      throw new ArchivesValidationException('One or more documents were not found')
    }

    const transfer = await db.transaction(async (trx) => {
      const transferNumber = await nextRecordNumber(tenantId, 'archival_transfer', 'ARC', trx)
      const row = await ArchivalTransfer.create(
        {
          tenantId,
          transferNumber,
          title: input.title,
          status: ArchivalTransferStatus.PENDING_APPROVAL,
          notes: input.notes ?? null,
          createdById: actor.id,
          approvedById: null,
          approvedAt: null,
          completedAt: null,
        },
        { client: trx }
      )
      for (const doc of docs) {
        await ArchivalTransferItem.create(
          {
            tenantId,
            transferId: row.id,
            documentId: doc.id,
          },
          { client: trx }
        )
      }
      return row
    })

    await auditService.log({
      tenantId,
      userId: actor.id,
      action: AuditAction.ARCHIVAL_TRANSFER_CREATE,
      entityType: 'archival_transfer',
      entityId: transfer.id,
      newValues: { transferNumber: transfer.transferNumber, count: docs.length },
    })

    return this.showTransfer(transfer.id)
  }

  async listTransfers(filters: { status?: string; page?: number; limit?: number }) {
    const tenantId = tenantContext.requireTenantId()
    const page = Math.max(filters.page ?? 1, 1)
    const limit = Math.min(Math.max(filters.limit ?? 20, 1), 100)
    const query = ArchivalTransfer.query()
      .where('tenant_id', tenantId)
      .preload('createdBy')
      .preload('approvedBy')
      .preload('items', (q) => q.preload('document'))
      .orderBy('created_at', 'desc')
    if (filters.status) query.where('status', filters.status)
    const paginator = await query.paginate(page, limit)
    return {
      data: paginator.all().map((t) => this.serializeTransfer(t)),
      meta: paginator.getMeta(),
    }
  }

  async showTransfer(id: string) {
    const transfer = await this.findTransferOrFail(id)
    await transfer.load('createdBy')
    await transfer.load('approvedBy')
    await transfer.load('items', (q) => q.preload('document'))
    return this.serializeTransfer(transfer)
  }

  async approveTransfer(id: string, actor: User) {
    const transfer = await this.findTransferOrFail(id)
    if (transfer.status !== ArchivalTransferStatus.PENDING_APPROVAL) {
      throw new ArchivesValidationException('Transfer is not pending approval')
    }
    transfer.status = ArchivalTransferStatus.APPROVED
    transfer.approvedById = actor.id
    transfer.approvedAt = DateTime.now()
    await transfer.save()

    await auditService.log({
      tenantId: transfer.tenantId,
      userId: actor.id,
      action: AuditAction.ARCHIVAL_TRANSFER_APPROVE,
      entityType: 'archival_transfer',
      entityId: transfer.id,
      newValues: { status: transfer.status },
    })

    return this.showTransfer(id)
  }

  async completeTransfer(id: string, actor: User) {
    const transfer = await this.findTransferOrFail(id)
    if (
      transfer.status !== ArchivalTransferStatus.APPROVED &&
      transfer.status !== ArchivalTransferStatus.PENDING_APPROVAL
    ) {
      throw new ArchivesValidationException('Transfer cannot be completed from current status')
    }
    await transfer.load('items')
    for (const item of transfer.items) {
      const document = await Document.query()
        .where('tenant_id', transfer.tenantId)
        .where('id', item.documentId)
        .first()
      if (!document) continue
      document.dispositionAction = DispositionAction.ARCHIVE
      await document.save()
      await recordsLifecycleService.transitionLifecycle(
        document,
        RecordsLifecycleStatus.ARCHIVED,
        actor,
        { reason: `archival_transfer:${transfer.transferNumber}` }
      )
    }

    transfer.status = ArchivalTransferStatus.COMPLETED
    transfer.completedAt = DateTime.now()
    if (!transfer.approvedById) {
      transfer.approvedById = actor.id
      transfer.approvedAt = DateTime.now()
    }
    await transfer.save()

    await auditService.log({
      tenantId: transfer.tenantId,
      userId: actor.id,
      action: AuditAction.ARCHIVAL_TRANSFER_COMPLETE,
      entityType: 'archival_transfer',
      entityId: transfer.id,
      newValues: { status: transfer.status },
    })

    return this.showTransfer(id)
  }

  async createDisposal(
    input: { title: string; justification: string; documentIds: string[] },
    actor: User
  ) {
    if (!input.documentIds.length) {
      throw new ArchivesValidationException('Select at least one document')
    }
    const tenantId = tenantContext.requireTenantId()
    const docs = await Document.query()
      .where('tenant_id', tenantId)
      .whereNull('deleted_at')
      .whereIn('id', input.documentIds)
    if (docs.length !== input.documentIds.length) {
      throw new ArchivesValidationException('One or more documents were not found')
    }
    const held = docs.filter((d) => d.legalHold)
    if (held.length) {
      throw new ArchivesValidationException(
        `Cannot dispose documents under legal hold (${held.map((d) => d.trackingNumber).join(', ')})`
      )
    }

    const request = await db.transaction(async (trx) => {
      const requestNumber = await nextRecordNumber(tenantId, 'disposal_request', 'DSP', trx)
      const row = await DisposalRequest.create(
        {
          tenantId,
          requestNumber,
          title: input.title,
          status: DisposalRequestStatus.PENDING,
          justification: input.justification,
          certificateNumber: null,
          certificateNotes: null,
          createdById: actor.id,
          approvedById: null,
          approvedAt: null,
          disposedAt: null,
        },
        { client: trx }
      )
      for (const doc of docs) {
        await DisposalRequestItem.create(
          {
            tenantId,
            disposalRequestId: row.id,
            documentId: doc.id,
          },
          { client: trx }
        )
      }
      return row
    })

    await auditService.log({
      tenantId,
      userId: actor.id,
      action: AuditAction.DISPOSAL_REQUEST_CREATE,
      entityType: 'disposal_request',
      entityId: request.id,
      newValues: { requestNumber: request.requestNumber, count: docs.length },
    })

    return this.showDisposal(request.id)
  }

  async listDisposals(filters: { status?: string; page?: number; limit?: number }) {
    const tenantId = tenantContext.requireTenantId()
    const page = Math.max(filters.page ?? 1, 1)
    const limit = Math.min(Math.max(filters.limit ?? 20, 1), 100)
    const query = DisposalRequest.query()
      .where('tenant_id', tenantId)
      .preload('createdBy')
      .preload('approvedBy')
      .preload('items', (q) => q.preload('document'))
      .orderBy('created_at', 'desc')
    if (filters.status) query.where('status', filters.status)
    const paginator = await query.paginate(page, limit)
    return {
      data: paginator.all().map((r) => this.serializeDisposal(r)),
      meta: paginator.getMeta(),
    }
  }

  async showDisposal(id: string) {
    const request = await this.findDisposalOrFail(id)
    await request.load('createdBy')
    await request.load('approvedBy')
    await request.load('items', (q) => q.preload('document'))
    return this.serializeDisposal(request)
  }

  async approveDisposal(id: string, actor: User) {
    const request = await this.findDisposalOrFail(id)
    if (request.status !== DisposalRequestStatus.PENDING) {
      throw new ArchivesValidationException('Disposal is not pending')
    }
    request.status = DisposalRequestStatus.APPROVED
    request.approvedById = actor.id
    request.approvedAt = DateTime.now()
    await request.save()

    await auditService.log({
      tenantId: request.tenantId,
      userId: actor.id,
      action: AuditAction.DISPOSAL_REQUEST_APPROVE,
      entityType: 'disposal_request',
      entityId: request.id,
      newValues: { status: request.status },
    })

    return this.showDisposal(id)
  }

  async executeDisposal(id: string, actor: User, notes?: string) {
    const request = await this.findDisposalOrFail(id)
    if (
      request.status !== DisposalRequestStatus.APPROVED &&
      request.status !== DisposalRequestStatus.PENDING
    ) {
      throw new ArchivesValidationException('Disposal cannot be executed from current status')
    }
    await request.load('items')
    for (const item of request.items) {
      const document = await Document.query()
        .where('tenant_id', request.tenantId)
        .where('id', item.documentId)
        .first()
      if (!document) continue
      if (document.legalHold) {
        throw new ArchivesValidationException(
          `Document ${document.trackingNumber} is under legal hold`
        )
      }
      document.dispositionAction = DispositionAction.DISPOSE
      await recordsLifecycleService.transitionLifecycle(
        document,
        RecordsLifecycleStatus.INACTIVE,
        actor,
        { reason: `disposal:${request.requestNumber}` }
      )
      document.deletedAt = DateTime.now()
      await document.save()
    }

    const certHash = createHash('sha256')
      .update(`${request.id}:${request.requestNumber}:${Date.now()}`)
      .digest('hex')
      .slice(0, 16)
      .toUpperCase()

    request.status = DisposalRequestStatus.COMPLETED
    request.disposedAt = DateTime.now()
    request.certificateNumber = `CERT-${request.requestNumber}-${certHash}`
    request.certificateNotes = notes ?? 'Disposal completed with authority sign-off'
    if (!request.approvedById) {
      request.approvedById = actor.id
      request.approvedAt = DateTime.now()
    }
    await request.save()

    await auditService.log({
      tenantId: request.tenantId,
      userId: actor.id,
      action: AuditAction.DISPOSAL_REQUEST_COMPLETE,
      entityType: 'disposal_request',
      entityId: request.id,
      newValues: {
        status: request.status,
        certificateNumber: request.certificateNumber,
      },
    })

    return this.showDisposal(id)
  }

  private serializeTransfer(transfer: ArchivalTransfer) {
    return {
      id: transfer.id,
      transferNumber: transfer.transferNumber,
      title: transfer.title,
      status: transfer.status,
      notes: transfer.notes,
      approvedAt: transfer.approvedAt?.toISO() ?? null,
      completedAt: transfer.completedAt?.toISO() ?? null,
      createdAt: transfer.createdAt.toISO(),
      createdBy: transfer.createdBy
        ? {
            id: transfer.createdBy.id,
            fullName: transfer.createdBy.fullName,
            email: transfer.createdBy.email,
          }
        : null,
      approvedBy: transfer.approvedBy
        ? {
            id: transfer.approvedBy.id,
            fullName: transfer.approvedBy.fullName,
            email: transfer.approvedBy.email,
          }
        : null,
      items: (transfer.items ?? []).map((item) => ({
        id: item.id,
        document: item.document
          ? {
              id: item.document.id,
              title: item.document.title,
              trackingNumber: item.document.trackingNumber,
              lifecycleStatus: item.document.lifecycleStatus,
            }
          : { id: item.documentId },
      })),
    }
  }

  private serializeDisposal(request: DisposalRequest) {
    return {
      id: request.id,
      requestNumber: request.requestNumber,
      title: request.title,
      status: request.status,
      justification: request.justification,
      certificateNumber: request.certificateNumber,
      certificateNotes: request.certificateNotes,
      approvedAt: request.approvedAt?.toISO() ?? null,
      disposedAt: request.disposedAt?.toISO() ?? null,
      createdAt: request.createdAt.toISO(),
      createdBy: request.createdBy
        ? {
            id: request.createdBy.id,
            fullName: request.createdBy.fullName,
            email: request.createdBy.email,
          }
        : null,
      approvedBy: request.approvedBy
        ? {
            id: request.approvedBy.id,
            fullName: request.approvedBy.fullName,
            email: request.approvedBy.email,
          }
        : null,
      items: (request.items ?? []).map((item) => ({
        id: item.id,
        document: item.document
          ? {
              id: item.document.id,
              title: item.document.title,
              trackingNumber: item.document.trackingNumber,
              lifecycleStatus: item.document.lifecycleStatus,
            }
          : { id: item.documentId },
      })),
    }
  }

  private async findTransferOrFail(id: string) {
    const tenantId = tenantContext.requireTenantId()
    const transfer = await ArchivalTransfer.query().where('tenant_id', tenantId).where('id', id).first()
    if (!transfer) throw new ArchivesNotFoundException('Archival transfer not found')
    return transfer
  }

  private async findDisposalOrFail(id: string) {
    const tenantId = tenantContext.requireTenantId()
    const request = await DisposalRequest.query().where('tenant_id', tenantId).where('id', id).first()
    if (!request) throw new ArchivesNotFoundException('Disposal request not found')
    return request
  }
}

export const archivesService = new ArchivesService()
