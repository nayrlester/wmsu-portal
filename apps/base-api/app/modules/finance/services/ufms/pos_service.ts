import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import PosTerminal from '#modules/finance/models/pos_terminal'
import PosCatalogItem from '#modules/finance/models/pos_catalog_item'
import PosSale from '#modules/finance/models/pos_sale'
import PosSaleLine from '#modules/finance/models/pos_sale_line'
import PosSalePayment from '#modules/finance/models/pos_sale_payment'
import PosEodSession from '#modules/finance/models/pos_eod_session'
import PosUimsStockSnapshot from '#modules/finance/models/pos_uims_stock_snapshot'
import PosUimsStockEvent from '#modules/finance/models/pos_uims_stock_event'
import OrSeries from '#modules/finance/models/or_series'
import { accountingService } from '#modules/finance/services/ufms/accounting_service'
import { procurementService } from '#modules/finance/services/ufms/procurement_service'
import { auditLogService } from '#modules/finance/services/audit_log_service'
import { addMoney, cmpMoney, fromCents, subMoney, toCents } from '#modules/finance/helpers/money'

type Actor = { id: string; organizationId: string }

const PAYMENT_METHODS = new Set(['cash', 'card', 'e_wallet', 'other'])

function moneyOrZero(v: unknown) {
  if (v === undefined || v === null || v === '') return '0.00'
  return fromCents(toCents(v as string | number))
}

function percentOf(amount: string, percent: string | number) {
  const p = Number(percent)
  if (!Number.isFinite(p) || p < 0) {
    throw Object.assign(new Error('Percent must be a non-negative number'), { status: 422 })
  }
  const bps = BigInt(Math.round(p * 100))
  return fromCents((toCents(amount) * bps) / 10000n)
}

function qtyMoney(qty: number, unitPrice: string) {
  if (!Number.isFinite(qty) || qty <= 0) {
    throw Object.assign(new Error('Quantity must be positive'), { status: 422 })
  }
  const qtyScaled = BigInt(Math.round(qty * 10000))
  return fromCents((qtyScaled * toCents(unitPrice)) / 10000n)
}

function seq(prefix: string) {
  return `${prefix}-${DateTime.now().toFormat('yyyyLLdd')}-${Date.now().toString(36).toUpperCase()}`
}

async function allocateReceiptNumber(organizationId: string, orSeriesId: string | null, trx: any) {
  if (!orSeriesId) return seq('POS')
  const series = await OrSeries.query({ client: trx })
    .where('organizationId', organizationId)
    .where('id', orSeriesId)
    .where('isActive', true)
    .forUpdate()
    .first()
  if (!series) {
    throw Object.assign(new Error('OR series not found or inactive for POS terminal'), { status: 422 })
  }
  const n = Number(series.nextNumber)
  const padded = String(n).padStart(series.padding || 6, '0')
  series.nextNumber = n + 1
  await series.useTransaction(trx).save()
  return `${series.prefix}${padded}`
}

export class PosService {
  async listTerminals(organizationId: string) {
    return PosTerminal.query().where('organizationId', organizationId).orderBy('terminalCode')
  }

  async upsertTerminal(actor: Actor, payload: Record<string, unknown>, id?: string) {
    const data = {
      terminalCode: String(payload.terminalCode).trim(),
      name: String(payload.name).trim(),
      isActive: payload.isActive === undefined ? true : Boolean(payload.isActive),
      fundId: (payload.fundId as string | null | undefined) ?? null,
      cashAccountId: (payload.cashAccountId as string | null | undefined) ?? null,
      revenueAccountId: (payload.revenueAccountId as string | null | undefined) ?? null,
      orSeriesId: (payload.orSeriesId as string | null | undefined) ?? null,
      updatedBy: actor.id,
    }
    let row: PosTerminal
    if (id) {
      row = await PosTerminal.query()
        .where('organizationId', actor.organizationId)
        .where('id', id)
        .firstOrFail()
      row.merge(data)
      await row.save()
    } else {
      row = await PosTerminal.create({
        organizationId: actor.organizationId,
        createdBy: actor.id,
        ...data,
      })
    }
    await auditLogService.log({
      organizationId: actor.organizationId,
      actorUserId: actor.id,
      action: id ? 'pos.terminal.update' : 'pos.terminal.create',
      entityType: 'pos_terminal',
      entityId: row.id,
      metadata: { tor: 'FIN-018' },
    })
    return row
  }

  async listCatalog(
    organizationId: string,
    filters: { q?: string; category?: string; activeOnly?: boolean; page?: number; limit?: number }
  ) {
    const page = filters.page ?? 1
    const limit = Math.min(filters.limit ?? 50, 100)
    const q = PosCatalogItem.query().where('organizationId', organizationId).orderBy('itemCode')
    if (filters.activeOnly) q.where('isActive', true)
    if (filters.category) q.where('category', filters.category)
    if (filters.q) {
      const term = `%${filters.q}%`
      q.where((b) => b.whereILike('itemCode', term).orWhereILike('description', term))
    }
    return q.paginate(page, limit)
  }

  async upsertCatalogItem(actor: Actor, payload: Record<string, unknown>, id?: string) {
    const data = {
      itemCode: String(payload.itemCode).trim(),
      description: String(payload.description).trim(),
      category: (payload.category as string | null | undefined) ?? null,
      itemKind: String(payload.itemKind ?? 'product'),
      unitPrice: moneyOrZero(payload.unitPrice),
      taxPercent: moneyOrZero(payload.taxPercent ?? 0),
      discountPercent: moneyOrZero(payload.discountPercent ?? 0),
      isActive: payload.isActive === undefined ? true : Boolean(payload.isActive),
      tracksInventory: Boolean(payload.tracksInventory),
      uimsItemRef: (payload.uimsItemRef as string | null | undefined) ?? null,
      reorderThreshold:
        payload.reorderThreshold !== undefined && payload.reorderThreshold !== null
          ? String(payload.reorderThreshold)
          : null,
      updatedBy: actor.id,
    }
    if (data.tracksInventory && !data.uimsItemRef) {
      throw Object.assign(new Error('Inventory-tracked catalog items require uimsItemRef (FIN-019)'), {
        status: 422,
      })
    }
    let row: PosCatalogItem
    if (id) {
      row = await PosCatalogItem.query()
        .where('organizationId', actor.organizationId)
        .where('id', id)
        .firstOrFail()
      row.merge(data)
      await row.save()
    } else {
      row = await PosCatalogItem.create({
        organizationId: actor.organizationId,
        createdBy: actor.id,
        ...data,
      })
    }
    await auditLogService.log({
      organizationId: actor.organizationId,
      actorUserId: actor.id,
      action: id ? 'pos.catalog.update' : 'pos.catalog.create',
      entityType: 'pos_catalog_item',
      entityId: row.id,
      metadata: { tor: ['FIN-017', 'FIN-030'] },
    })
    return row
  }

  async listSales(
    organizationId: string,
    filters: { status?: string; page?: number; limit?: number }
  ) {
    const page = filters.page ?? 1
    const limit = Math.min(filters.limit ?? 50, 100)
    const q = PosSale.query().where('organizationId', organizationId).orderBy('createdAt', 'desc')
    if (filters.status) q.where('status', filters.status)
    return q.paginate(page, limit)
  }

  async getSale(organizationId: string, id: string) {
    const sale = await PosSale.query()
      .where('organizationId', organizationId)
      .where('id', id)
      .preload('lines', (q) => q.orderBy('lineNo', 'asc'))
      .preload('payments', (q) => q.orderBy('lineNo', 'asc'))
      .first()
    if (!sale) throw Object.assign(new Error('Sale not found'), { status: 404 })
    return sale
  }

  async createSale(actor: Actor, payload: Record<string, unknown>) {
    const idempotencyKey = (payload.idempotencyKey as string | null | undefined)?.trim() || null
    if (idempotencyKey) {
      const existing = await PosSale.query()
        .where('organizationId', actor.organizationId)
        .where('idempotencyKey', idempotencyKey)
        .preload('lines')
        .preload('payments')
        .first()
      if (existing) return existing
    }

    const linesInput = (payload.lines as Array<Record<string, unknown>> | undefined) ?? []
    if (!linesInput.length) {
      throw Object.assign(new Error('Sale requires at least one line'), { status: 422 })
    }

    let terminal: PosTerminal | null = null
    if (payload.terminalId) {
      terminal = await PosTerminal.query()
        .where('organizationId', actor.organizationId)
        .where('id', String(payload.terminalId))
        .first()
      if (!terminal) throw Object.assign(new Error('Terminal not found'), { status: 422 })
    }

    const normalized = []
    for (const [index, line] of linesInput.entries()) {
      let catalog: PosCatalogItem | null = null
      if (line.catalogItemId) {
        catalog = await PosCatalogItem.query()
          .where('organizationId', actor.organizationId)
          .where('id', String(line.catalogItemId))
          .where('isActive', true)
          .first()
        if (!catalog) throw Object.assign(new Error('Catalog item not found or inactive'), { status: 422 })
      }
      const qty = Number(line.quantity ?? 1)
      const unitPrice = moneyOrZero(line.unitPrice ?? catalog?.unitPrice ?? 0)
      const taxPercent = moneyOrZero(line.taxPercent ?? catalog?.taxPercent ?? 0)
      const discountPercent = moneyOrZero(line.discountPercent ?? catalog?.discountPercent ?? 0)
      const lineSubtotal = qtyMoney(qty, unitPrice)
      const lineDiscount = percentOf(lineSubtotal, discountPercent)
      const taxable = subMoney(lineSubtotal, lineDiscount)
      const lineTax = percentOf(taxable, taxPercent)
      const lineTotal = addMoney(taxable, lineTax)
      normalized.push({
        lineNo: index + 1,
        catalogItemId: catalog?.id ?? null,
        itemCode: catalog?.itemCode ?? ((line.itemCode as string | null | undefined) ?? null),
        description: catalog?.description ?? String(line.description),
        quantity: String(qty),
        unitPrice,
        taxPercent,
        discountPercent,
        lineSubtotal,
        lineTax,
        lineDiscount,
        lineTotal,
        uimsItemRef: catalog?.uimsItemRef ?? ((line.uimsItemRef as string | null | undefined) ?? null),
        tracksInventory: catalog?.tracksInventory ?? false,
        reorderThreshold: catalog?.reorderThreshold ?? null,
      })
    }

    let subtotal = '0.00'
    let tax = '0.00'
    let discount = '0.00'
    let total = '0.00'
    for (const line of normalized) {
      subtotal = addMoney(subtotal, line.lineSubtotal)
      tax = addMoney(tax, line.lineTax)
      discount = addMoney(discount, line.lineDiscount)
      total = addMoney(total, line.lineTotal)
    }

    const created = await db.transaction(async (trx) => {
      const sale = await PosSale.create(
        {
          organizationId: actor.organizationId,
          terminalId: terminal?.id ?? null,
          saleNumber: String(payload.saleNumber ?? '').trim() || seq('SALE'),
          idempotencyKey,
          status: 'draft',
          subtotalAmount: subtotal,
          taxAmount: tax,
          discountAmount: discount,
          totalAmount: total,
          amountTendered: '0.00',
          changeAmount: '0.00',
          cashierId: actor.id,
          accountingStatus: 'not_linked',
          createdBy: actor.id,
          updatedBy: actor.id,
        },
        { client: trx }
      )
      for (const line of normalized) {
        const { tracksInventory: _t, reorderThreshold: _r, ...rest } = line
        await PosSaleLine.create(
          {
            organizationId: actor.organizationId,
            saleId: sale.id,
            ...rest,
          },
          { client: trx }
        )
      }
      await sale.useTransaction(trx).load('lines')
      await sale.useTransaction(trx).load('payments')
      return sale
    })

    await auditLogService.log({
      organizationId: actor.organizationId,
      actorUserId: actor.id,
      action: 'pos.sale.create',
      entityType: 'pos_sale',
      entityId: created.id,
      metadata: { saleNumber: created.saleNumber, tor: ['FIN-018', 'FIN-030'] },
    })
    return created
  }

  async completeSale(actor: Actor, id: string, payload: Record<string, unknown>) {
    const paymentsInput = (payload.payments as Array<Record<string, unknown>> | undefined) ?? []
    if (!paymentsInput.length) {
      throw Object.assign(new Error('At least one payment is required'), { status: 422 })
    }

    const sale = await this.getSale(actor.organizationId, id)
    if (sale.status === 'completed') return sale
    if (sale.status !== 'draft') {
      throw Object.assign(new Error('Only draft sales can be completed'), { status: 422 })
    }

    let tendered = '0.00'
    const payments = paymentsInput.map((p, index) => {
      const method = String(p.paymentMethod ?? 'cash')
      if (!PAYMENT_METHODS.has(method)) {
        throw Object.assign(new Error('paymentMethod must be cash, card, e_wallet, or other (FIN-018)'), {
          status: 422,
        })
      }
      if (p.cardNumber || p.pan || p.cvv) {
        throw Object.assign(new Error('Card PAN/CVV must not be submitted'), { status: 422 })
      }
      const amount = moneyOrZero(p.amount)
      tendered = addMoney(tendered, amount)
      return {
        lineNo: index + 1,
        paymentMethod: method,
        amount,
        paymentReference: (p.paymentReference as string | null | undefined) ?? null,
        status: 'recorded',
      }
    })

    if (cmpMoney(tendered, sale.totalAmount) < 0) {
      throw Object.assign(new Error('Amount tendered is less than sale total'), { status: 422 })
    }
    const change = subMoney(tendered, sale.totalAmount)

    let terminal: PosTerminal | null = null
    if (sale.terminalId) {
      terminal = await PosTerminal.find(sale.terminalId)
    }

    const catalogMeta = new Map<string, PosCatalogItem>()
    for (const line of sale.lines) {
      if (line.catalogItemId) {
        const item = await PosCatalogItem.find(line.catalogItemId)
        if (item) catalogMeta.set(item.id, item)
      }
    }

    const completed = await db.transaction(async (trx) => {
      const receiptNumber = await allocateReceiptNumber(
        actor.organizationId,
        terminal?.orSeriesId ?? null,
        trx
      )

      for (const payment of payments) {
        await PosSalePayment.create(
          {
            organizationId: actor.organizationId,
            saleId: sale.id,
            ...payment,
          },
          { client: trx }
        )
      }

      const snapshot = {
        saleNumber: sale.saleNumber,
        receiptNumber,
        completedAt: DateTime.now().toISO(),
        cashierId: actor.id,
        lines: sale.lines.map((l) => ({
          description: l.description,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          lineTotal: l.lineTotal,
        })),
        payments,
        subtotalAmount: sale.subtotalAmount,
        taxAmount: sale.taxAmount,
        discountAmount: sale.discountAmount,
        totalAmount: sale.totalAmount,
        amountTendered: tendered,
        changeAmount: change,
        note: 'BIR/COA receipt form layout For Clarification (FIN-018)',
      }

      sale.useTransaction(trx)
      sale.merge({
        status: 'completed',
        receiptNumber,
        amountTendered: tendered,
        changeAmount: change,
        cashierId: actor.id,
        completedAt: DateTime.now(),
        updatedBy: actor.id,
        receiptSnapshot: snapshot,
      })
      await sale.save()

      for (const line of sale.lines) {
        const catalog = line.catalogItemId ? catalogMeta.get(line.catalogItemId) : null
        const tracks = catalog?.tracksInventory || Boolean(line.uimsItemRef)
        const uimsRef = line.uimsItemRef || catalog?.uimsItemRef
        if (tracks && uimsRef) {
          await PosUimsStockEvent.create(
            {
              organizationId: actor.organizationId,
              saleId: sale.id,
              eventType: 'stock_deduction',
              uimsItemRef: uimsRef,
              status: 'pending',
              payload: {
                quantity: line.quantity,
                saleNumber: sale.saleNumber,
                tor: ['FIN-019', 'FIN-030'],
                note: 'UIMS live deduction contract For Clarification',
              },
            },
            { client: trx }
          )

          const snap = await PosUimsStockSnapshot.query({ client: trx })
            .where('organizationId', actor.organizationId)
            .where('uimsItemRef', uimsRef)
            .first()
          if (snap) {
            const nextQty = Math.max(0, Number(snap.quantityOnHand) - Number(line.quantity))
            snap.useTransaction(trx)
            snap.quantityOnHand = String(nextQty)
            snap.sourcedAt = DateTime.now()
            snap.source = 'pos_sale_cache_adjust'
            await snap.save()

            const threshold = catalog?.reorderThreshold
            if (threshold !== null && threshold !== undefined && nextQty <= Number(threshold)) {
              await PosUimsStockEvent.create(
                {
                  organizationId: actor.organizationId,
                  saleId: sale.id,
                  eventType: 'low_stock_pr',
                  uimsItemRef: uimsRef,
                  status: 'pending',
                  payload: {
                    quantityOnHand: nextQty,
                    reorderThreshold: threshold,
                    catalogItemId: catalog?.id,
                    tor: 'FIN-030',
                  },
                },
                { client: trx }
              )
            }
          }
        }
      }

      await sale.useTransaction(trx).load('lines')
      await sale.useTransaction(trx).load('payments')
      return sale
    })

    await this.tryLinkAccounting(actor, completed, terminal)
    await this.tryCreateLowStockPrs(actor, completed.id)

    await auditLogService.log({
      organizationId: actor.organizationId,
      actorUserId: actor.id,
      action: 'pos.sale.complete',
      entityType: 'pos_sale',
      entityId: completed.id,
      metadata: { receiptNumber: completed.receiptNumber, tor: ['FIN-018', 'FIN-030'] },
    })
    return this.getSale(actor.organizationId, completed.id)
  }

  private async tryLinkAccounting(actor: Actor, sale: PosSale, terminal: PosTerminal | null) {
    if (!terminal?.fundId || !terminal.cashAccountId || !terminal.revenueAccountId) {
      sale.accountingStatus = 'skipped_no_mapping'
      sale.accountingError =
        'Terminal lacks fund/cash/revenue account mapping — JE not created (mapping For Clarification)'
      await sale.save()
      return
    }
    if (sale.journalEntryId) return

    try {
      const journal = await accountingService.createJournal(actor, {
        entryType: 'journal',
        fiscalYear: String(DateTime.now().year),
        entryDate: DateTime.now().toISODate(),
        description: `POS sale ${sale.saleNumber}`,
        sourceModule: 'pos',
        sourceRef: sale.id,
        lines: [
          {
            fundId: terminal.fundId,
            accountId: terminal.cashAccountId,
            debitAmount: sale.totalAmount,
            creditAmount: 0,
            particulars: `POS receipt ${sale.receiptNumber}`,
          },
          {
            fundId: terminal.fundId,
            accountId: terminal.revenueAccountId,
            debitAmount: 0,
            creditAmount: sale.totalAmount,
            particulars: `POS sale ${sale.saleNumber}`,
          },
        ],
      })
      sale.journalEntryId = journal.id
      sale.accountingStatus = 'draft_journal'
      sale.accountingError = null
      await sale.save()
    } catch (error) {
      sale.accountingStatus = 'failed'
      sale.accountingError = (error as Error).message
      await sale.save()
    }
  }

  private async tryCreateLowStockPrs(actor: Actor, saleId: string) {
    const events = await PosUimsStockEvent.query()
      .where('organizationId', actor.organizationId)
      .where('saleId', saleId)
      .where('eventType', 'low_stock_pr')
      .where('status', 'pending')

    for (const event of events) {
      try {
        const catalogId = (event.payload as any)?.catalogItemId as string | undefined
        const catalog = catalogId
          ? await PosCatalogItem.query()
              .where('organizationId', actor.organizationId)
              .where('id', catalogId)
              .first()
          : null
        const pr = await procurementService.createRequisition(actor, {
          fiscalYear: String(DateTime.now().year),
          purpose: `Low-stock reorder: ${catalog?.description || event.uimsItemRef}`,
          lines: [
            {
              description: catalog?.description || `Reorder ${event.uimsItemRef}`,
              quantity: 1,
              unitCost: catalog ? Number(catalog.unitPrice) : 0,
              estimatedAmount: catalog ? Number(catalog.unitPrice) : 0,
            },
          ],
        })
        event.purchaseRequisitionId = pr.id
        event.status = 'queued'
        event.lastError = null
        await event.save()
      } catch (error) {
        event.status = 'failed'
        event.lastError = (error as Error).message
        await event.save()
      }
    }
  }

  async voidSale(actor: Actor, id: string, reason: string) {
    const sale = await this.getSale(actor.organizationId, id)
    if (sale.status !== 'completed') {
      throw Object.assign(new Error('Only completed sales can be voided'), { status: 422 })
    }
    if (sale.eodSessionId) {
      throw Object.assign(new Error('Sale already included in an EOD session'), { status: 422 })
    }
    sale.merge({
      status: 'voided',
      voidedAt: DateTime.now(),
      voidedBy: actor.id,
      voidReason: reason || 'Voided',
      updatedBy: actor.id,
    })
    await sale.save()
    await auditLogService.log({
      organizationId: actor.organizationId,
      actorUserId: actor.id,
      action: 'pos.sale.void',
      entityType: 'pos_sale',
      entityId: sale.id,
      metadata: { reason, tor: 'FIN-018' },
    })
    return sale
  }

  async refundSale(actor: Actor, id: string, payload: Record<string, unknown>) {
    const sale = await this.getSale(actor.organizationId, id)
    if (sale.status !== 'completed') {
      throw Object.assign(new Error('Only completed sales can be refunded'), { status: 422 })
    }
    if (sale.eodSessionId) {
      throw Object.assign(new Error('Sale already included in an EOD session — use next-day credit note process'), {
        status: 422,
      })
    }
    const reason = String(payload.reason ?? 'Customer refund')
    const refundAmountRaw = payload.amount !== undefined ? Number(payload.amount) : Number(sale.totalAmount)
    if (!Number.isFinite(refundAmountRaw) || refundAmountRaw <= 0) {
      throw Object.assign(new Error('Refund amount must be positive'), { status: 422 })
    }
    if (refundAmountRaw > Number(sale.totalAmount) + 0.001) {
      throw Object.assign(new Error('Refund cannot exceed original sale amount'), { status: 422 })
    }
    const full = Math.abs(refundAmountRaw - Number(sale.totalAmount)) < 0.01
    if (full) {
      return this.voidSale(actor, id, reason)
    }
    sale.merge({
      status: 'voided',
      voidedAt: DateTime.now(),
      voidedBy: actor.id,
      voidReason: `Partial refund ₱${refundAmountRaw.toFixed(2)}: ${reason}`,
      updatedBy: actor.id,
      receiptSnapshot: {
        ...(typeof sale.receiptSnapshot === 'object' && sale.receiptSnapshot ? sale.receiptSnapshot : {}),
        refund: {
          amount: refundAmountRaw,
          reason,
          partial: true,
          refundedAt: DateTime.now().toISO(),
          refundedBy: actor.id,
        },
      },
    })
    await sale.save()
    await auditLogService.log({
      organizationId: actor.organizationId,
      actorUserId: actor.id,
      action: 'pos.sale.refund',
      entityType: 'pos_sale',
      entityId: sale.id,
      metadata: { reason, amount: refundAmountRaw, partial: true, tor: 'FIN-018' },
    })
    return sale
  }

  async closeEod(actor: Actor, payload: Record<string, unknown>) {
    const businessDate = String(payload.businessDate || DateTime.now().toISODate())
    const terminalId = (payload.terminalId as string | null | undefined) ?? null

    const q = PosSale.query()
      .where('organizationId', actor.organizationId)
      .whereNull('eodSessionId')
      .whereIn('status', ['completed', 'voided'])
      .whereRaw('DATE(completed_at) = ?', [businessDate])
    if (terminalId) q.where('terminalId', terminalId)
    const sales = await q

    let salesCount = 0
    let gross = '0.00'
    let voidCount = 0
    let voidAmount = '0.00'
    for (const sale of sales) {
      if (sale.status === 'completed') {
        salesCount += 1
        gross = addMoney(gross, sale.totalAmount)
      } else if (sale.status === 'voided') {
        voidCount += 1
        voidAmount = addMoney(voidAmount, sale.totalAmount)
      }
    }
    const net = subMoney(gross, '0.00')

    const session = await db.transaction(async (trx) => {
      const row = await PosEodSession.create(
        {
          organizationId: actor.organizationId,
          terminalId,
          sessionNumber: seq('EOD'),
          businessDate: DateTime.fromISO(businessDate),
          cashierId: actor.id,
          salesCount: String(salesCount),
          grossSales: gross,
          voidCount: String(voidCount),
          voidAmount,
          netSales: net,
          status: 'closed',
          closedAt: DateTime.now(),
          notes: (payload.notes as string | null | undefined) ?? null,
        },
        { client: trx }
      )
      for (const sale of sales) {
        sale.useTransaction(trx)
        sale.eodSessionId = row.id
        await sale.save()
      }
      return row
    })

    await auditLogService.log({
      organizationId: actor.organizationId,
      actorUserId: actor.id,
      action: 'pos.eod.close',
      entityType: 'pos_eod_session',
      entityId: session.id,
      metadata: { businessDate, salesCount, gross, tor: 'FIN-018' },
    })
    return session
  }

  async cashierReport(organizationId: string, businessDate?: string) {
    const date = businessDate || DateTime.now().toISODate()!
    const sales = await PosSale.query()
      .where('organizationId', organizationId)
      .where('status', 'completed')
      .whereRaw('DATE(completed_at) = ?', [date])
    let total = '0.00'
    for (const sale of sales) total = addMoney(total, sale.totalAmount)
    return {
      businessDate: date,
      completedSales: sales.length,
      grossSales: total,
      tor: 'FIN-018',
    }
  }

  async upsertStockSnapshot(actor: Actor, payload: Record<string, unknown>) {
    const uimsItemRef = String(payload.uimsItemRef).trim()
    const quantityOnHand = String(payload.quantityOnHand)
    let row = await PosUimsStockSnapshot.query()
      .where('organizationId', actor.organizationId)
      .where('uimsItemRef', uimsItemRef)
      .first()
    if (row) {
      row.merge({
        quantityOnHand,
        uom: (payload.uom as string | null | undefined) ?? row.uom,
        sourcedAt: DateTime.now(),
        source: String(payload.source ?? 'uims_cache'),
      })
      await row.save()
    } else {
      row = await PosUimsStockSnapshot.create({
        organizationId: actor.organizationId,
        uimsItemRef,
        quantityOnHand,
        uom: (payload.uom as string | null | undefined) ?? null,
        sourcedAt: DateTime.now(),
        source: String(payload.source ?? 'uims_cache'),
      })
    }
    await auditLogService.log({
      organizationId: actor.organizationId,
      actorUserId: actor.id,
      action: 'pos.stock_snapshot.upsert',
      entityType: 'pos_uims_stock_snapshot',
      entityId: row.id,
      metadata: { uimsItemRef, note: 'Cache only — UIMS remains inventory SoR', tor: 'FIN-019' },
    })
    return row
  }

  async listStockSnapshots(organizationId: string) {
    return PosUimsStockSnapshot.query()
      .where('organizationId', organizationId)
      .orderBy('uimsItemRef')
  }

  /** Legacy stub path — creates and completes a one-line cash sale. */
  async recordLegacySale(actor: Actor, payload: Record<string, unknown>) {
    const sale = await this.createSale(actor, {
      lines: [
        {
          description: String(payload.itemDescription ?? 'Sale'),
          quantity: 1,
          unitPrice: payload.amount ?? 0,
        },
      ],
      idempotencyKey: (payload.reference as string | undefined) ?? undefined,
    })
    return this.completeSale(actor, sale.id, {
      payments: [{ paymentMethod: 'cash', amount: sale.totalAmount }],
    })
  }
}

export const posService = new PosService()
