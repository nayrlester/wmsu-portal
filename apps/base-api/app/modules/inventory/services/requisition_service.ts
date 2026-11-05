import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import SupplyRequisition from '#modules/inventory/models/supply_requisition'
import SupplyRequisitionLine from '#modules/inventory/models/supply_requisition_line'
import { RequisitionStatus, AuditAction } from '#modules/inventory/domain/enums/index'
import { stockMovementService } from '#modules/inventory/services/stock_movement_service'
import { auditLogService } from '#modules/inventory/services/audit_log_service'

export class RequisitionService {
  async list(orgId: string, page = 1, limit = 25, status?: string) {
    const q = SupplyRequisition.query()
      .where('organizationId', orgId)
      .preload('lines', (lq) => lq.preload('item'))
      .preload('requestingOffice')
      .preload('requester')
    if (status) q.where('status', status)
    return q.orderBy('createdAt', 'desc').paginate(page, limit)
  }

  async getById(orgId: string, id: string) {
    return SupplyRequisition.query()
      .where('organizationId', orgId)
      .where('id', id)
      .preload('lines', (lq) => lq.preload('item'))
      .preload('requestingOffice')
      .preload('requester')
      .preload('approver')
      .firstOrFail()
  }

  async create(orgId: string, data: Record<string, any>, userId: string) {
    return db.transaction(async (trx) => {
      const count = await SupplyRequisition.query({ client: trx })
        .where('organizationId', orgId)
        .count('* as total')
      const seq = Number(count[0].$extras.total ?? 0) + 1
      const requisitionNo = `REQ-${DateTime.now().toFormat('yyyyMM')}-${String(seq).padStart(4, '0')}`

      const req = await SupplyRequisition.create(
        {
          organizationId: orgId,
          requisitionNo,
          requestingOfficeId: data.requestingOfficeId ?? null,
          requestedBy: userId,
          status: RequisitionStatus.DRAFT,
          purpose: data.purpose ?? null,
        },
        { client: trx }
      )

      for (const line of data.lines) {
        await SupplyRequisitionLine.create(
          {
            requisitionId: req.id,
            itemId: line.itemId,
            quantityRequested: line.quantityRequested,
            quantityApproved: null,
            quantityIssued: 0,
            notes: line.notes ?? null,
          },
          { client: trx }
        )
      }

      await req.load('lines')
      return req
    })
  }

  async submit(orgId: string, id: string, userId: string) {
    const req = await this.getById(orgId, id)
    if (req.status !== RequisitionStatus.DRAFT) {
      throw new Error('Only draft requisitions can be submitted')
    }
    req.status = RequisitionStatus.SUBMITTED
    await req.save()
    await auditLogService.log({
      organizationId: orgId,
      actorUserId: userId,
      action: AuditAction.REQUISITION_SUBMIT,
      entityType: 'supply_requisition',
      entityId: req.id,
    })
    return req
  }

  async approve(orgId: string, id: string, data: Record<string, any>, userId: string) {
    const req = await this.getById(orgId, id)
    if (req.status !== RequisitionStatus.SUBMITTED) {
      throw new Error('Only submitted requisitions can be approved')
    }

    if (data.lines?.length) {
      for (const line of data.lines) {
        const row = req.lines.find((l) => l.id === line.lineId)
        if (row) {
          row.quantityApproved = line.quantityApproved
          await row.save()
        }
      }
    } else {
      for (const row of req.lines) {
        row.quantityApproved = row.quantityRequested
        await row.save()
      }
    }

    req.status = RequisitionStatus.APPROVED
    req.approvedBy = userId
    req.approvedAt = DateTime.now()
    await req.save()

    await auditLogService.log({
      organizationId: orgId,
      actorUserId: userId,
      action: AuditAction.REQUISITION_APPROVE,
      entityType: 'supply_requisition',
      entityId: req.id,
    })

    return this.getById(orgId, id)
  }

  async reject(orgId: string, id: string, reason: string | undefined, userId: string) {
    const req = await this.getById(orgId, id)
    if (req.status !== RequisitionStatus.SUBMITTED) {
      throw new Error('Only submitted requisitions can be rejected')
    }
    req.status = RequisitionStatus.REJECTED
    req.approvedBy = userId
    req.approvedAt = DateTime.now()
    if (reason) req.purpose = `${req.purpose ?? ''}\n[Rejected] ${reason}`.trim()
    await req.save()

    await auditLogService.log({
      organizationId: orgId,
      actorUserId: userId,
      action: AuditAction.REQUISITION_REJECT,
      entityType: 'supply_requisition',
      entityId: req.id,
      metadata: { reason },
    })
    return req
  }

  async fulfill(orgId: string, id: string, data: Record<string, any>, userId: string) {
    const req = await this.getById(orgId, id)
    if (req.status !== RequisitionStatus.APPROVED) {
      throw new Error('Only approved requisitions can be fulfilled')
    }

    const stockLines = []
    for (const line of data.lines) {
      const row = req.lines.find((l) => l.id === line.lineId)
      if (!row) throw new Error(`Line ${line.lineId} not found`)
      const approved = row.quantityApproved ?? row.quantityRequested
      if (line.quantityIssued > approved - Number(row.quantityIssued)) {
        throw new Error(`Issue qty exceeds remaining approved for line ${line.lineId}`)
      }
      stockLines.push({
        itemId: row.itemId,
        warehouseId: data.warehouseId,
        binId: line.binId ?? null,
        quantity: line.quantityIssued,
      })
      row.quantityIssued = Number(row.quantityIssued) + line.quantityIssued
      await row.save()
    }

    await stockMovementService.processIssue(
      orgId,
      stockLines,
      req.requisitionNo,
      `Fulfill requisition ${req.requisitionNo}`,
      userId
    )

    req.status = RequisitionStatus.FULFILLED
    req.fulfilledAt = DateTime.now()
    await req.save()

    await auditLogService.log({
      organizationId: orgId,
      actorUserId: userId,
      action: AuditAction.REQUISITION_FULFILL,
      entityType: 'supply_requisition',
      entityId: req.id,
    })

    return this.getById(orgId, id)
  }
}

export const requisitionService = new RequisitionService()
