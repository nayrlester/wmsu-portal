import StockBalance from '#modules/records/models/stock_balance'
import InventoryTransaction from '#modules/records/models/inventory_transaction'
import PropertyLedgerEntry from '#modules/records/models/property_ledger_entry'
import AssetDepreciationEntry from '#modules/records/models/asset_depreciation_entry'
import AssetDepreciationProfile from '#modules/records/models/asset_depreciation_profile'
import { TransactionType, AuditAction } from '#modules/records/domain/enums/index'
import { auditLogService } from '#modules/records/services/audit_log_service'

function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return ''
  const keys = Object.keys(rows[0])
  const escape = (v: unknown) => {
    const s = v == null ? '' : String(v)
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s
  }
  return [keys.join(','), ...rows.map((r) => keys.map((k) => escape(r[k])).join(','))].join('\n')
}

export class ReportService {
  async stockInventory(orgId: string, warehouseId?: string) {
    const q = StockBalance.query()
      .preload('item', (iq) => iq.where('organizationId', orgId).whereNull('deletedAt'))
      .preload('warehouse')
      .preload('bin')
    if (warehouseId) q.where('warehouseId', warehouseId)
    const balances = await q.orderBy('itemId')

    return balances
      .filter((b) => b.item)
      .map((b) => ({
        itemId: b.itemId,
        sku: b.item.sku,
        name: b.item.name,
        uom: b.item.uom,
        warehouseId: b.warehouseId,
        warehouseCode: b.warehouse?.code,
        binCode: b.bin?.binCode ?? null,
        quantity: b.quantity,
        reservedQuantity: b.reservedQuantity,
        availableQuantity: b.availableQuantity,
        avgUnitCost: b.avgUnitCost,
        totalValue: Number(b.quantity) * Number(b.avgUnitCost),
        lotNumber: b.lotNumber,
        expiresAt: b.expiresAt,
        safetyStock: b.item.safetyStock,
        minStock: b.item.minStock,
      }))
  }

  async propertyLedger(orgId: string, assetId?: string) {
    const q = PropertyLedgerEntry.query().where('organizationId', orgId).preload('asset')
    if (assetId) q.where('assetId', assetId)
    const rows = await q.orderBy('occurredAt', 'desc').limit(5000)
    return rows.map((r) => ({
      id: r.id,
      assetId: r.assetId,
      assetCode: r.asset?.assetCode,
      assetName: r.asset?.name,
      entryType: r.entryType,
      reference: r.reference,
      debit: r.debit,
      credit: r.credit,
      balanceAfter: r.balanceAfter,
      narrative: r.narrative,
      occurredAt: r.occurredAt?.toISO(),
    }))
  }

  async consumption(orgId: string, from?: string, to?: string) {
    const q = InventoryTransaction.query()
      .where('organizationId', orgId)
      .whereIn('type', [TransactionType.ISSUE, TransactionType.DISPOSAL])
      .preload('item')
      .preload('fromWarehouse')
    if (from) q.where('createdAt', '>=', from)
    if (to) q.where('createdAt', '<=', to)
    const rows = await q.orderBy('createdAt', 'desc').limit(5000)
    return rows.map((r) => ({
      id: r.id,
      type: r.type,
      itemId: r.itemId,
      sku: r.item?.sku,
      name: r.item?.name,
      warehouseId: r.fromWarehouseId,
      warehouseCode: r.fromWarehouse?.code,
      quantity: r.quantity,
      unitCost: r.unitCost,
      reference: r.reference,
      createdAt: r.createdAt?.toISO(),
    }))
  }

  async depreciation(orgId: string, periodYear?: number, periodMonth?: number) {
    const q = AssetDepreciationEntry.query().where('organizationId', orgId).preload('asset')
    if (periodYear) q.where('periodYear', periodYear)
    if (periodMonth) q.where('periodMonth', periodMonth)
    const entries = await q.orderBy('periodYear', 'desc').orderBy('periodMonth', 'desc').limit(5000)

    const profiles = await AssetDepreciationProfile.query()
      .where('organizationId', orgId)
      .preload('asset')

    return {
      entries: entries.map((e) => ({
        id: e.id,
        assetId: e.assetId,
        assetCode: e.asset?.assetCode,
        assetName: e.asset?.name,
        periodYear: e.periodYear,
        periodMonth: e.periodMonth,
        deprAmount: e.deprAmount,
        accumDeprAfter: e.accumDeprAfter,
        bookValueAfter: e.bookValueAfter,
        postedAt: e.postedAt?.toISO(),
      })),
      profiles: profiles.map((p) => ({
        assetId: p.assetId,
        assetCode: p.asset?.assetCode,
        acquisitionCost: p.acquisitionCost,
        accumDepr: p.accumDepr,
        bookValue: p.bookValue,
        usefulLifeMonths: p.usefulLifeMonths,
        residualRate: p.residualRate,
        active: p.active,
      })),
    }
  }

  formatCsv(rows: Record<string, unknown>[]) {
    return toCsv(rows)
  }

  async logExport(orgId: string, userId: string, report: string) {
    await auditLogService.log({
      organizationId: orgId,
      actorUserId: userId,
      action: AuditAction.REPORT_EXPORT,
      entityType: 'report',
      entityId: null,
      metadata: { report },
    })
  }
}

export const reportService = new ReportService()
