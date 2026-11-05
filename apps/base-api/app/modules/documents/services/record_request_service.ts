import { DateTime } from 'luxon'
import { Exception } from '@adonisjs/core/exceptions'
import db from '@adonisjs/lucid/services/db'
import {
  AuditAction,
  RecordAccessMode,
  RecordRequestItemStatus,
  RecordRequestStatus,
  ReleaseEventType,
} from '#modules/documents/domain/enums/index'
import { tenantContext } from '#modules/documents/domain/tenant_context'
import { DocumentConfidentialityPolicy } from '#modules/documents/domain/documents/document_confidentiality_policy'
import Document from '#modules/documents/models/document'
import RecordRequest from '#modules/documents/models/record_request'
import RecordRequestItem from '#modules/documents/models/record_request_item'
import ReleaseEvent from '#modules/documents/models/release_event'
import User from '#modules/documents/models/user'
import { auditService } from '#modules/documents/services/audit_service'
import { notificationDispatcherService } from '#modules/documents/services/notification_dispatcher_service'
import { NotificationTrigger } from '#modules/documents/domain/notifications/notification_types'

export class RecordRequestValidationException extends Exception {
  static status = 422
  static code = 'E_RECORD_REQUEST_VALIDATION'

  constructor(message: string) {
    super(message, { status: 422, code: 'E_RECORD_REQUEST_VALIDATION' })
  }
}

export class RecordRequestNotFoundException extends Exception {
  static status = 404
  static code = 'E_RECORD_REQUEST_NOT_FOUND'

  constructor(message = 'Record request not found') {
    super(message, { status: 404, code: 'E_RECORD_REQUEST_NOT_FOUND' })
  }
}

export class RecordRequestForbiddenException extends Exception {
  static status = 403
  static code = 'E_RECORD_REQUEST_FORBIDDEN'

  constructor(message = 'Not allowed to access this record request') {
    super(message, { status: 403, code: 'E_RECORD_REQUEST_FORBIDDEN' })
  }
}

type CreateInput = {
  purpose: string
  accessMode: string
  requestingOfficeId?: string
  neededBy?: string
  dueAt?: string
  notes?: string
  documentIds: string[]
}

type ListFilters = {
  status?: string
  mine?: boolean
  overdue?: boolean
  page?: number
  limit?: number
}

export class RecordRequestService {
  async list(filters: ListFilters, actor: User, canManageDesk: boolean) {
    const tenantId = tenantContext.requireTenantId()
    const page = Math.max(filters.page ?? 1, 1)
    const limit = Math.min(Math.max(filters.limit ?? 20, 1), 100)

    const query = RecordRequest.query()
      .where('tenant_id', tenantId)
      .preload('requestingOffice')
      .preload('requester')
      .preload('approver')
      .preload('items', (q) => q.preload('document'))
      .orderBy('created_at', 'desc')

    if (filters.mine || !canManageDesk) {
      query.where('requester_id', actor.id)
    }
    if (filters.status) {
      query.where('status', filters.status)
    }
    if (filters.overdue) {
      const now = DateTime.now().toSQL()!
      query
        .whereIn('status', [RecordRequestStatus.CHECKED_OUT, RecordRequestStatus.PARTIALLY_RETURNED])
        .whereNotNull('due_at')
        .where('due_at', '<', now)
    }

    const paginator = await query.paginate(page, limit)
    return {
      data: paginator.all().map((row) => this.serialize(row)),
      meta: paginator.getMeta(),
    }
  }

  async show(id: string, actor: User, canManageDesk: boolean) {
    const request = await this.findOrFail(id)
    this.assertCanView(request, actor, canManageDesk)
    await this.preload(request)
    return this.serialize(request, true)
  }

  async create(input: CreateInput, actor: User) {
    const tenantId = tenantContext.requireTenantId()
    const uniqueDocIds = [...new Set(input.documentIds)]
    const documents = await Document.query()
      .where('tenant_id', tenantId)
      .whereNull('deleted_at')
      .whereIn('id', uniqueDocIds)

    if (documents.length !== uniqueDocIds.length) {
      throw new RecordRequestValidationException('One or more documents were not found')
    }

    for (const document of documents) {
      await DocumentConfidentialityPolicy.assertCanView(document, actor, tenantId)
      if (input.accessMode === RecordAccessMode.DOWNLOAD) {
        await DocumentConfidentialityPolicy.assertCanDownload(document, actor, tenantId)
      }
    }

    const neededBy = this.parseOptionalDate(input.neededBy, 'neededBy')
    const dueAt = this.parseOptionalDate(input.dueAt, 'dueAt')

    const request = await db.transaction(async (trx) => {
      const requestNumber = await this.nextRequestNumber(tenantId, trx)
      const row = await RecordRequest.create(
        {
          tenantId,
          requestNumber,
          status: RecordRequestStatus.PENDING,
          requestingOfficeId: input.requestingOfficeId ?? null,
          requesterId: actor.id,
          approverId: null,
          fulfilledById: null,
          purpose: input.purpose,
          accessMode: input.accessMode,
          neededBy,
          dueAt,
          notes: input.notes ?? null,
          denialReason: null,
          approvedAt: null,
          releasedAt: null,
          returnedAt: null,
          cancelledAt: null,
        },
        { client: trx }
      )

      for (const document of documents) {
        await RecordRequestItem.create(
          {
            tenantId,
            recordRequestId: row.id,
            documentId: document.id,
            status: RecordRequestItemStatus.PENDING,
            notes: null,
            releasedAt: null,
            returnedAt: null,
          },
          { client: trx }
        )
      }

      await ReleaseEvent.create(
        {
          tenantId,
          recordRequestId: row.id,
          recordRequestItemId: null,
          documentId: null,
          actorId: actor.id,
          eventType: ReleaseEventType.SUBMITTED,
          notes: input.purpose,
          metadata: { accessMode: input.accessMode, documentCount: documents.length },
        },
        { client: trx }
      )

      return row
    })

    await auditService.log({
      tenantId,
      userId: actor.id,
      action: AuditAction.RECORD_REQUEST_CREATE,
      entityType: 'record_request',
      entityId: request.id,
      newValues: { requestNumber: request.requestNumber, status: request.status },
    })

    await this.notifyDesk(request, NotificationTrigger.RECORD_REQUEST_SUBMITTED, {
      title: `Records request ${request.requestNumber}`,
      body: `${actor.fullName ?? actor.email} requested ${uniqueDocIds.length} record(s)`,
    })

    await this.preload(request)
    return this.serialize(request, true)
  }

  async approve(id: string, actor: User) {
    const request = await this.findOrFail(id)
    if (request.status !== RecordRequestStatus.PENDING) {
      throw new RecordRequestValidationException('Only pending requests can be approved')
    }

    const now = DateTime.now()
    request.status = RecordRequestStatus.APPROVED
    request.approverId = actor.id
    request.approvedAt = now
    await request.save()

    const items = await RecordRequestItem.query().where('record_request_id', request.id)
    for (const item of items) {
      item.status = RecordRequestItemStatus.APPROVED
      await item.save()
    }

    await this.logEvent(request, actor, ReleaseEventType.APPROVED)
    await auditService.log({
      tenantId: request.tenantId,
      userId: actor.id,
      action: AuditAction.RECORD_REQUEST_APPROVE,
      entityType: 'record_request',
      entityId: request.id,
      newValues: { status: request.status },
    })

    await this.notifyRequester(request, NotificationTrigger.RECORD_REQUEST_APPROVED, {
      title: `Request ${request.requestNumber} approved`,
      body: 'Your records request was approved and is ready for release.',
    })

    await this.preload(request)
    return this.serialize(request, true)
  }

  async deny(id: string, actor: User, reason: string) {
    const request = await this.findOrFail(id)
    if (request.status !== RecordRequestStatus.PENDING) {
      throw new RecordRequestValidationException('Only pending requests can be denied')
    }

    request.status = RecordRequestStatus.DENIED
    request.approverId = actor.id
    request.denialReason = reason
    request.approvedAt = DateTime.now()
    await request.save()

    const items = await RecordRequestItem.query().where('record_request_id', request.id)
    for (const item of items) {
      item.status = RecordRequestItemStatus.DENIED
      await item.save()
    }

    await this.logEvent(request, actor, ReleaseEventType.DENIED, reason)
    await auditService.log({
      tenantId: request.tenantId,
      userId: actor.id,
      action: AuditAction.RECORD_REQUEST_DENY,
      entityType: 'record_request',
      entityId: request.id,
      newValues: { status: request.status, reason },
    })

    await this.notifyRequester(request, NotificationTrigger.RECORD_REQUEST_DENIED, {
      title: `Request ${request.requestNumber} denied`,
      body: reason,
    })

    await this.preload(request)
    return this.serialize(request, true)
  }

  async release(
    id: string,
    actor: User,
    options: { itemIds?: string[]; notes?: string; dueAt?: string } = {}
  ) {
    const request = await this.findOrFail(id)
    if (
      request.status !== RecordRequestStatus.APPROVED &&
      request.status !== RecordRequestStatus.CHECKED_OUT &&
      request.status !== RecordRequestStatus.PARTIALLY_RETURNED
    ) {
      throw new RecordRequestValidationException(
        'Only approved or partially open requests can be released'
      )
    }

    await this.preload(request)
    const targets = this.selectItems(
      request.items,
      options.itemIds,
      [RecordRequestItemStatus.APPROVED, RecordRequestItemStatus.RETURNED]
    )
    if (!targets.length) {
      throw new RecordRequestValidationException('No releasable items selected')
    }

    const now = DateTime.now()
    const dueAt = this.parseOptionalDate(options.dueAt, 'dueAt') ?? request.dueAt ?? now.plus({ days: 7 })

    for (const item of targets) {
      item.status = RecordRequestItemStatus.CHECKED_OUT
      item.releasedAt = now
      item.returnedAt = null
      item.notes = options.notes ?? item.notes
      await item.save()
      await this.logEvent(request, actor, ReleaseEventType.RELEASED, options.notes, item)
    }

    request.status = RecordRequestStatus.CHECKED_OUT
    request.fulfilledById = actor.id
    request.releasedAt = request.releasedAt ?? now
    request.dueAt = dueAt
    request.returnedAt = null
    await request.save()

    // If some approved items remain unreleased, still checked_out is fine for ops.
    await auditService.log({
      tenantId: request.tenantId,
      userId: actor.id,
      action: AuditAction.RECORD_REQUEST_RELEASE,
      entityType: 'record_request',
      entityId: request.id,
      newValues: {
        status: request.status,
        itemIds: targets.map((i) => i.id),
        dueAt: dueAt?.toISO(),
      },
    })

    await this.notifyRequester(request, NotificationTrigger.RECORD_REQUEST_RELEASED, {
      title: `Records released for ${request.requestNumber}`,
      body: `${targets.length} record(s) were released. Due ${dueAt.toFormat('yyyy-LL-dd')}.`,
    })

    await this.preload(request)
    return this.serialize(request, true)
  }

  async returnItems(
    id: string,
    actor: User,
    options: { itemIds?: string[]; notes?: string } = {}
  ) {
    const request = await this.findOrFail(id)
    if (
      request.status !== RecordRequestStatus.CHECKED_OUT &&
      request.status !== RecordRequestStatus.PARTIALLY_RETURNED
    ) {
      throw new RecordRequestValidationException('Only checked-out requests can be returned')
    }

    await this.preload(request)
    const targets = this.selectItems(request.items, options.itemIds, [
      RecordRequestItemStatus.CHECKED_OUT,
    ])
    if (!targets.length) {
      throw new RecordRequestValidationException('No checked-out items selected')
    }

    const now = DateTime.now()
    for (const item of targets) {
      item.status = RecordRequestItemStatus.RETURNED
      item.returnedAt = now
      item.notes = options.notes ?? item.notes
      await item.save()
      await this.logEvent(request, actor, ReleaseEventType.RETURNED, options.notes, item)
    }

    await this.preload(request)
    const stillOut = request.items.filter((i) => i.status === RecordRequestItemStatus.CHECKED_OUT)
    request.status = stillOut.length
      ? RecordRequestStatus.PARTIALLY_RETURNED
      : RecordRequestStatus.RETURNED
    if (!stillOut.length) {
      request.returnedAt = now
    }
    await request.save()

    await auditService.log({
      tenantId: request.tenantId,
      userId: actor.id,
      action: AuditAction.RECORD_REQUEST_RETURN,
      entityType: 'record_request',
      entityId: request.id,
      newValues: { status: request.status, itemIds: targets.map((i) => i.id) },
    })

    await this.notifyRequester(request, NotificationTrigger.RECORD_REQUEST_RETURNED, {
      title: `Return recorded for ${request.requestNumber}`,
      body: `${targets.length} record(s) returned. Status: ${request.status}.`,
    })

    return this.serialize(request, true)
  }

  async cancel(id: string, actor: User, canManageDesk: boolean, reason?: string) {
    const request = await this.findOrFail(id)
    this.assertCanView(request, actor, canManageDesk)

    if (
      request.status !== RecordRequestStatus.PENDING &&
      request.status !== RecordRequestStatus.APPROVED
    ) {
      throw new RecordRequestValidationException(
        'Only pending or approved (unreleased) requests can be cancelled'
      )
    }

    if (request.requesterId !== actor.id && !canManageDesk) {
      throw new RecordRequestForbiddenException()
    }

    request.status = RecordRequestStatus.CANCELLED
    request.cancelledAt = DateTime.now()
    if (reason) request.notes = reason
    await request.save()

    const items = await RecordRequestItem.query().where('record_request_id', request.id)
    for (const item of items) {
      if (
        item.status === RecordRequestItemStatus.PENDING ||
        item.status === RecordRequestItemStatus.APPROVED
      ) {
        item.status = RecordRequestItemStatus.CANCELLED
        await item.save()
      }
    }

    await this.logEvent(request, actor, ReleaseEventType.CANCELLED, reason)
    await auditService.log({
      tenantId: request.tenantId,
      userId: actor.id,
      action: AuditAction.RECORD_REQUEST_CANCEL,
      entityType: 'record_request',
      entityId: request.id,
      newValues: { status: request.status, reason },
    })

    await this.preload(request)
    return this.serialize(request, true)
  }

  serialize(request: RecordRequest, includeEvents = false) {
    const dueAt = request.dueAt
    const isOverdue =
      Boolean(dueAt) &&
      dueAt! < DateTime.now() &&
      (request.status === RecordRequestStatus.CHECKED_OUT ||
        request.status === RecordRequestStatus.PARTIALLY_RETURNED)

    return {
      id: request.id,
      requestNumber: request.requestNumber,
      status: request.status,
      purpose: request.purpose,
      accessMode: request.accessMode,
      notes: request.notes,
      denialReason: request.denialReason,
      neededBy: request.neededBy?.toISO() ?? null,
      dueAt: dueAt?.toISO() ?? null,
      isOverdue,
      approvedAt: request.approvedAt?.toISO() ?? null,
      releasedAt: request.releasedAt?.toISO() ?? null,
      returnedAt: request.returnedAt?.toISO() ?? null,
      cancelledAt: request.cancelledAt?.toISO() ?? null,
      createdAt: request.createdAt.toISO(),
      updatedAt: request.updatedAt?.toISO() ?? null,
      requestingOffice: request.requestingOffice
        ? { id: request.requestingOffice.id, name: request.requestingOffice.name }
        : null,
      requester: request.requester
        ? {
            id: request.requester.id,
            fullName: request.requester.fullName,
            email: request.requester.email,
          }
        : null,
      approver: request.approver
        ? {
            id: request.approver.id,
            fullName: request.approver.fullName,
            email: request.approver.email,
          }
        : null,
      items: (request.items ?? []).map((item) => ({
        id: item.id,
        status: item.status,
        notes: item.notes,
        releasedAt: item.releasedAt?.toISO() ?? null,
        returnedAt: item.returnedAt?.toISO() ?? null,
        document: item.document
          ? {
              id: item.document.id,
              title: item.document.title,
              trackingNumber: item.document.trackingNumber,
              status: item.document.status,
              confidentiality: item.document.confidentiality,
            }
          : { id: item.documentId },
      })),
      events: includeEvents
        ? (request.events ?? []).map((event) => ({
            id: event.id,
            eventType: event.eventType,
            notes: event.notes,
            metadata: event.metadata,
            createdAt: event.createdAt.toISO(),
            actor: event.actor
              ? {
                  id: event.actor.id,
                  fullName: event.actor.fullName,
                  email: event.actor.email,
                }
              : null,
            documentId: event.documentId,
            itemId: event.recordRequestItemId,
          }))
        : undefined,
    }
  }

  private async findOrFail(id: string) {
    const tenantId = tenantContext.requireTenantId()
    const request = await RecordRequest.query()
      .where('tenant_id', tenantId)
      .where('id', id)
      .first()
    if (!request) throw new RecordRequestNotFoundException()
    return request
  }

  private assertCanView(request: RecordRequest, actor: User, canManageDesk: boolean) {
    if (canManageDesk || request.requesterId === actor.id) return
    throw new RecordRequestForbiddenException()
  }

  private async preload(request: RecordRequest) {
    await request.load('requestingOffice')
    await request.load('requester')
    await request.load('approver')
    await request.load('items', (q) => q.preload('document'))
    await request.load('events', (q) => q.preload('actor').orderBy('created_at', 'asc'))
  }

  private selectItems(
    items: RecordRequestItem[],
    itemIds: string[] | undefined,
    allowed: string[]
  ) {
    const pool = items.filter((item) => allowed.includes(item.status))
    if (!itemIds?.length) return pool
    const set = new Set(itemIds)
    return pool.filter((item) => set.has(item.id))
  }

  private parseOptionalDate(value: string | undefined, field: string) {
    if (!value) return null
    const parsed = DateTime.fromISO(value)
    if (!parsed.isValid) {
      throw new RecordRequestValidationException(`Invalid ${field} datetime`)
    }
    return parsed
  }

  private async nextRequestNumber(tenantId: string, trx: any) {
    const year = new Date().getFullYear()
    const existing = await trx
      .from('record_number_sequences')
      .where({ tenant_id: tenantId, sequence_name: 'record_request', year })
      .forUpdate()
      .first()

    let nextNumber: number
    if (existing) {
      nextNumber = Number(existing.last_number) + 1
      await trx
        .from('record_number_sequences')
        .where({ id: existing.id })
        .update({ last_number: nextNumber, updated_at: new Date() })
    } else {
      nextNumber = 1
      await trx.table('record_number_sequences').insert({
        tenant_id: tenantId,
        sequence_name: 'record_request',
        year,
        last_number: nextNumber,
        created_at: new Date(),
      })
    }

    return `RR-${year}-${String(nextNumber).padStart(7, '0')}`
  }

  private async logEvent(
    request: RecordRequest,
    actor: User,
    eventType: ReleaseEventType,
    notes?: string | null,
    item?: RecordRequestItem
  ) {
    await ReleaseEvent.create({
      tenantId: request.tenantId,
      recordRequestId: request.id,
      recordRequestItemId: item?.id ?? null,
      documentId: item?.documentId ?? null,
      actorId: actor.id,
      eventType,
      notes: notes ?? null,
      metadata: null,
    })
  }

  private async notifyRequester(
    request: RecordRequest,
    trigger: NotificationTrigger,
    content: { title: string; body: string }
  ) {
    await notificationDispatcherService.dispatch({
      tenantId: request.tenantId,
      documentId: request.id,
      trigger,
      recipientUserIds: [request.requesterId],
      title: content.title,
      body: content.body,
      data: { recordRequestId: request.id, requestNumber: request.requestNumber },
    })
  }

  private async notifyDesk(
    request: RecordRequest,
    trigger: NotificationTrigger,
    content: { title: string; body: string }
  ) {
    const managers = await User.query()
      .where('tenant_id', request.tenantId)
      .whereNull('deleted_at')
      .whereHas('roles', (rolesQuery) => {
        rolesQuery.whereHas('permissions', (permQuery) => {
          permQuery.where('slug', 'records.release.manage')
        })
      })

    const recipientUserIds = managers.map((u) => u.id).filter((id) => id !== request.requesterId)
    if (!recipientUserIds.length) return

    await notificationDispatcherService.dispatch({
      tenantId: request.tenantId,
      documentId: request.id,
      trigger,
      recipientUserIds,
      title: content.title,
      body: content.body,
      data: { recordRequestId: request.id, requestNumber: request.requestNumber },
    })
  }
}

export const recordRequestService = new RecordRequestService()
