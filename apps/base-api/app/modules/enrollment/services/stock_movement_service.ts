import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import InventoryTransaction from '#modules/enrollment/models/inventory_transaction'
import InventoryLedger from '#modules/enrollment/models/inventory_ledger'
import StockBalance from '#modules/enrollment/models/stock_balance'
import StockReservation from '#modules/enrollment/models/stock_reservation'
import { TransactionType, type TransactionTypeValue, AuditAction } from '#modules/enrollment/domain/enums/index'
import { auditLogService } from '#modules/enrollment/services/audit_log_service'

interface StockLine {
  itemId: string
  warehouseId: string
  binId?: string | null
  quantity: number
  unitCost?: number | null
}

interface TransferLine {
  itemId: string
  fromWarehouseId: string
  toWarehouseId: string
  fromBinId?: string | null
  toBinId?: string | null
  quantity: number
}

interface AdjustLine {
  itemId: string
  warehouseId: string
  binId?: string | null
  quantity: number
  unitCost?: number | null
  reason: string
}

export class StockMovementService {
  async processBeginning(orgId: string, lines: StockLine[], reference?: string, notes?: string, userId?: string) {
    return this.processInbound(orgId, TransactionType.BEGINNING, lines, reference, notes, userId)
  }

  async processReceive(orgId: string, lines: StockLine[], reference?: string, notes?: string, userId?: string) {
    return this.processInbound(orgId, TransactionType.RECEIVE, lines, reference, notes, userId)
  }

  async processIssue(orgId: string, lines: StockLine[], reference?: string, notes?: string, userId?: string) {
    return this.processOutbound(orgId, TransactionType.ISSUE, lines, reference, notes, userId)
  }

  async processReturn(orgId: string, lines: StockLine[], reference?: string, notes?: string, userId?: string) {
    const txns = await this.processInbound(orgId, TransactionType.RETURN, lines, reference, notes, userId)
    await auditLogService.log({
      organizationId: orgId,
      actorUserId: userId,
      action: AuditAction.STOCK_RETURN,
      entityType: 'inventory_transaction',
      entityId: txns[0]?.id ?? null,
      metadata: { lineCount: lines.length, reference },
    })
    return txns
  }

  async processDisposal(orgId: string, lines: StockLine[], reference?: string, notes?: string, userId?: string) {
    const txns = await this.processOutbound(orgId, TransactionType.DISPOSAL, lines, reference, notes, userId)
    await auditLogService.log({
      organizationId: orgId,
      actorUserId: userId,
      action: AuditAction.STOCK_DISPOSAL,
      entityType: 'inventory_transaction',
      entityId: txns[0]?.id ?? null,
      metadata: { lineCount: lines.length, reference },
    })
    return txns
  }

  async processReserve(
    orgId: string,
    data: {
      itemId: string
      warehouseId: string
      quantity: number
      reference?: string
      requisitionId?: string
      expiresAt?: string
    },
    userId?: string
  ) {
    return db.transaction(async (trx) => {
      const bal = await this.getOrCreateBalance(trx, data.itemId, data.warehouseId, null)
      const available = Number(bal.quantity) - Number(bal.reservedQuantity)
      if (available < data.quantity) {
        throw new Error(
          `Insufficient available stock to reserve. Available: ${available}, requested: ${data.quantity}`
        )
      }

      bal.reservedQuantity = Number(bal.reservedQuantity) + data.quantity
      await bal.useTransaction(trx).save()

      const reservation = await StockReservation.create(
        {
          organizationId: orgId,
          itemId: data.itemId,
          warehouseId: data.warehouseId,
          quantity: data.quantity,
          status: 'active',
          reference: data.reference ?? null,
          requisitionId: data.requisitionId ?? null,
          createdBy: userId ?? null,
          expiresAt: data.expiresAt ? DateTime.fromISO(data.expiresAt) : null,
        },
        { client: trx }
      )

      await InventoryTransaction.create(
        {
          organizationId: orgId,
          type: TransactionType.RESERVE,
          itemId: data.itemId,
          fromWarehouseId: data.warehouseId,
          quantity: data.quantity,
          reference: data.reference ?? null,
          notes: `Reservation ${reservation.id}`,
          createdBy: userId ?? null,
        },
        { client: trx }
      )

      await auditLogService.log({
        organizationId: orgId,
        actorUserId: userId,
        action: AuditAction.STOCK_RESERVE,
        entityType: 'stock_reservation',
        entityId: reservation.id,
      })

      return reservation
    })
  }

  async processRelease(orgId: string, reservationId: string, quantity?: number, userId?: string) {
    return db.transaction(async (trx) => {
      const reservation = await StockReservation.query({ client: trx })
        .where('organizationId', orgId)
        .where('id', reservationId)
        .firstOrFail()

      if (reservation.status !== 'active') {
        throw new Error('Reservation is not active')
      }

      const releaseQty = quantity ?? Number(reservation.quantity)
      if (releaseQty > Number(reservation.quantity)) {
        throw new Error('Release quantity exceeds reservation')
      }

      const bal = await this.getOrCreateBalance(trx, reservation.itemId, reservation.warehouseId, null)
      bal.reservedQuantity = Math.max(0, Number(bal.reservedQuantity) - releaseQty)
      await bal.useTransaction(trx).save()

      if (releaseQty >= Number(reservation.quantity)) {
        reservation.status = 'released'
        reservation.quantity = 0
      } else {
        reservation.quantity = Number(reservation.quantity) - releaseQty
      }
      await reservation.useTransaction(trx).save()

      await InventoryTransaction.create(
        {
          organizationId: orgId,
          type: TransactionType.RELEASE,
          itemId: reservation.itemId,
          toWarehouseId: reservation.warehouseId,
          quantity: releaseQty,
          reference: reservation.reference,
          notes: `Release reservation ${reservation.id}`,
          createdBy: userId ?? null,
        },
        { client: trx }
      )

      await auditLogService.log({
        organizationId: orgId,
        actorUserId: userId,
        action: AuditAction.STOCK_RELEASE,
        entityType: 'stock_reservation',
        entityId: reservation.id,
        metadata: { quantity: releaseQty },
      })

      return reservation
    })
  }

  async processTransfer(orgId: string, lines: TransferLine[], reference?: string, notes?: string, userId?: string) {
    return db.transaction(async (trx) => {
      const txns: InventoryTransaction[] = []
      for (const line of lines) {
        const txn = await InventoryTransaction.create(
          {
            organizationId: orgId,
            type: TransactionType.TRANSFER,
            itemId: line.itemId,
            fromWarehouseId: line.fromWarehouseId,
            toWarehouseId: line.toWarehouseId,
            quantity: line.quantity,
            reference,
            notes,
            createdBy: userId ?? null,
          },
          { client: trx }
        )

        await this.deductBalance(trx, line.itemId, line.fromWarehouseId, line.fromBinId ?? null, line.quantity)
        const fromBal = await this.getOrCreateBalance(trx, line.itemId, line.fromWarehouseId, line.fromBinId ?? null)
        await InventoryLedger.create(
          {
            organizationId: orgId,
            transactionId: txn.id,
            itemId: line.itemId,
            warehouseId: line.fromWarehouseId,
            binId: line.fromBinId ?? null,
            qtyIn: 0,
            qtyOut: line.quantity,
            balanceAfter: fromBal.quantity,
            occurredAt: DateTime.now(),
          },
          { client: trx }
        )

        await this.addBalance(trx, line.itemId, line.toWarehouseId, line.toBinId ?? null, line.quantity, 0)
        const toBal = await this.getOrCreateBalance(trx, line.itemId, line.toWarehouseId, line.toBinId ?? null)
        await InventoryLedger.create(
          {
            organizationId: orgId,
            transactionId: txn.id,
            itemId: line.itemId,
            warehouseId: line.toWarehouseId,
            binId: line.toBinId ?? null,
            qtyIn: line.quantity,
            qtyOut: 0,
            balanceAfter: toBal.quantity,
            occurredAt: DateTime.now(),
          },
          { client: trx }
        )

        txns.push(txn)
      }
      return txns
    })
  }

  async processAdjust(orgId: string, lines: AdjustLine[], reference?: string, notes?: string, userId?: string) {
    return db.transaction(async (trx) => {
      const txns: InventoryTransaction[] = []
      for (const line of lines) {
        const isPositive = line.quantity >= 0
        const txn = await InventoryTransaction.create(
          {
            organizationId: orgId,
            type: TransactionType.ADJUST,
            itemId: line.itemId,
            toWarehouseId: isPositive ? line.warehouseId : null,
            fromWarehouseId: isPositive ? null : line.warehouseId,
            quantity: Math.abs(line.quantity),
            unitCost: line.unitCost ?? null,
            reference,
            notes: line.reason + (notes ? ` | ${notes}` : ''),
            createdBy: userId ?? null,
          },
          { client: trx }
        )

        if (isPositive) {
          await this.addBalance(trx, line.itemId, line.warehouseId, line.binId ?? null, line.quantity, line.unitCost ?? 0)
        } else {
          await this.deductBalance(trx, line.itemId, line.warehouseId, line.binId ?? null, Math.abs(line.quantity))
        }

        const bal = await this.getOrCreateBalance(trx, line.itemId, line.warehouseId, line.binId ?? null)
        await InventoryLedger.create(
          {
            organizationId: orgId,
            transactionId: txn.id,
            itemId: line.itemId,
            warehouseId: line.warehouseId,
            binId: line.binId ?? null,
            qtyIn: isPositive ? Math.abs(line.quantity) : 0,
            qtyOut: isPositive ? 0 : Math.abs(line.quantity),
            balanceAfter: bal.quantity,
            unitCost: line.unitCost ?? null,
            occurredAt: DateTime.now(),
          },
          { client: trx }
        )

        txns.push(txn)
      }
      return txns
    })
  }

  async listTransactions(orgId: string, page = 1, limit = 25, type?: string) {
    const q = InventoryTransaction.query()
      .where('organizationId', orgId)
      .preload('item')
      .preload('fromWarehouse')
      .preload('toWarehouse')
      .preload('creator')
    if (type) q.where('type', type)
    return q.orderBy('createdAt', 'desc').paginate(page, limit)
  }

  async listLedger(orgId: string, itemId: string, warehouseId?: string, page = 1, limit = 50) {
    const q = InventoryLedger.query()
      .where('organizationId', orgId)
      .where('itemId', itemId)
      .preload('transaction')
      .preload('warehouse')
    if (warehouseId) q.where('warehouseId', warehouseId)
    return q.orderBy('occurredAt', 'desc').paginate(page, limit)
  }

  async getBalances(orgId: string, itemId?: string, warehouseId?: string) {
    const q = StockBalance.query()
      .preload('item', (iq) => iq.where('organizationId', orgId))
      .preload('warehouse')
      .preload('bin')
    if (itemId) q.where('itemId', itemId)
    if (warehouseId) q.where('warehouseId', warehouseId)
    return q.orderBy('itemId')
  }

  private async processInbound(
    orgId: string,
    type: TransactionTypeValue,
    lines: StockLine[],
    reference?: string,
    notes?: string,
    userId?: string
  ) {
    return db.transaction(async (trx) => {
      const txns: InventoryTransaction[] = []
      for (const line of lines) {
        const txn = await InventoryTransaction.create(
          {
            organizationId: orgId,
            type,
            itemId: line.itemId,
            toWarehouseId: line.warehouseId,
            quantity: line.quantity,
            unitCost: line.unitCost ?? null,
            reference,
            notes,
            createdBy: userId ?? null,
          },
          { client: trx }
        )

        await this.addBalance(trx, line.itemId, line.warehouseId, line.binId ?? null, line.quantity, line.unitCost ?? 0)

        const bal = await this.getOrCreateBalance(trx, line.itemId, line.warehouseId, line.binId ?? null)
        await InventoryLedger.create(
          {
            organizationId: orgId,
            transactionId: txn.id,
            itemId: line.itemId,
            warehouseId: line.warehouseId,
            binId: line.binId ?? null,
            qtyIn: line.quantity,
            qtyOut: 0,
            balanceAfter: bal.quantity,
            unitCost: line.unitCost ?? null,
            occurredAt: DateTime.now(),
          },
          { client: trx }
        )

        txns.push(txn)
      }
      return txns
    })
  }

  private async processOutbound(
    orgId: string,
    type: TransactionTypeValue,
    lines: StockLine[],
    reference?: string,
    notes?: string,
    userId?: string
  ) {
    return db.transaction(async (trx) => {
      const txns: InventoryTransaction[] = []
      for (const line of lines) {
        const txn = await InventoryTransaction.create(
          {
            organizationId: orgId,
            type,
            itemId: line.itemId,
            fromWarehouseId: line.warehouseId,
            quantity: line.quantity,
            unitCost: line.unitCost ?? null,
            reference,
            notes,
            createdBy: userId ?? null,
          },
          { client: trx }
        )

        await this.deductBalance(trx, line.itemId, line.warehouseId, line.binId ?? null, line.quantity)

        const bal = await this.getOrCreateBalance(trx, line.itemId, line.warehouseId, line.binId ?? null)
        await InventoryLedger.create(
          {
            organizationId: orgId,
            transactionId: txn.id,
            itemId: line.itemId,
            warehouseId: line.warehouseId,
            binId: line.binId ?? null,
            qtyIn: 0,
            qtyOut: line.quantity,
            balanceAfter: bal.quantity,
            unitCost: line.unitCost ?? null,
            occurredAt: DateTime.now(),
          },
          { client: trx }
        )

        txns.push(txn)
      }
      return txns
    })
  }

  private async getOrCreateBalance(trx: any, itemId: string, warehouseId: string, binId: string | null) {
    const existing = await StockBalance.query({ client: trx })
      .where('itemId', itemId)
      .where('warehouseId', warehouseId)
      .if(binId, (q) => q.where('binId', binId!))
      .if(!binId, (q) => q.whereNull('binId'))
      .first()

    if (existing) return existing

    return StockBalance.create(
      {
        itemId,
        warehouseId,
        binId,
        quantity: 0,
        reservedQuantity: 0,
        avgUnitCost: 0,
      },
      { client: trx }
    )
  }

  private async addBalance(
    trx: any,
    itemId: string,
    warehouseId: string,
    binId: string | null,
    qty: number,
    unitCost: number
  ) {
    const bal = await this.getOrCreateBalance(trx, itemId, warehouseId, binId)
    const oldQty = Number(bal.quantity)
    const oldCost = Number(bal.avgUnitCost)
    const newQty = oldQty + qty
    if (unitCost > 0 && newQty > 0) {
      bal.avgUnitCost = (oldQty * oldCost + qty * unitCost) / newQty
    }
    bal.quantity = newQty
    await bal.useTransaction(trx).save()
  }

  private async deductBalance(trx: any, itemId: string, warehouseId: string, binId: string | null, qty: number) {
    const bal = await this.getOrCreateBalance(trx, itemId, warehouseId, binId)
    const available = Number(bal.quantity) - Number(bal.reservedQuantity)
    if (available < qty) {
      throw new Error(
        `Insufficient stock for item ${itemId} in warehouse ${warehouseId}. Available: ${available}, requested: ${qty}`
      )
    }
    bal.quantity = Number(bal.quantity) - qty
    await bal.useTransaction(trx).save()
  }
}

export const stockMovementService = new StockMovementService()
