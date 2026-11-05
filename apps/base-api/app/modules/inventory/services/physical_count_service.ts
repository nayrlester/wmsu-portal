import { DateTime } from 'luxon'
import PhysicalCountSession from '#modules/inventory/models/physical_count_session'
import PhysicalCountLine from '#modules/inventory/models/physical_count_line'
import StockBalance from '#modules/inventory/models/stock_balance'
import Asset from '#modules/inventory/models/asset'
import { AuditAction, CountSessionStatus } from '#modules/inventory/domain/enums/index'
import { stockMovementService } from '#modules/inventory/services/stock_movement_service'
import { auditLogService } from '#modules/inventory/services/audit_log_service'

export class PhysicalCountService {
  async list(orgId: string, page = 1, limit = 25, status?: string) {
    const q = PhysicalCountSession.query()
      .where('organizationId', orgId)
      .preload('warehouse')
      .preload('campus')
      .preload('lines')
    if (status) q.where('status', status)
    return q.orderBy('createdAt', 'desc').paginate(page, limit)
  }

  async getById(orgId: string, id: string) {
    return PhysicalCountSession.query()
      .where('organizationId', orgId)
      .where('id', id)
      .preload('warehouse')
      .preload('campus')
      .preload('lines', (lq) => lq.preload('item').preload('asset'))
      .firstOrFail()
  }

  async create(orgId: string, data: Record<string, any>, userId: string) {
    const count = await PhysicalCountSession.query().where('organizationId', orgId).count('* as total')
    const seq = Number(count[0].$extras.total ?? 0) + 1
    const sessionNo =
      data.sessionNo ?? `PC-${DateTime.now().toFormat('yyyyMM')}-${String(seq).padStart(4, '0')}`

    const session = await PhysicalCountSession.create({
      organizationId: orgId,
      sessionNo,
      countType: data.countType ?? 'stock',
      warehouseId: data.warehouseId ?? null,
      campusId: data.campusId ?? null,
      status: CountSessionStatus.OPEN,
      scheduledDate: data.scheduledDate ?? null,
      createdBy: userId,
    })

    await auditLogService.log({
      organizationId: orgId,
      actorUserId: userId,
      action: AuditAction.COUNT_CREATE,
      entityType: 'physical_count_session',
      entityId: session.id,
    })

    return session
  }

  async scanLine(orgId: string, sessionId: string, data: Record<string, any>, userId: string) {
    const session = await this.getById(orgId, sessionId)
    if (session.status !== CountSessionStatus.OPEN) {
      throw new Error('Session is not open for scanning')
    }

    let systemQty = data.systemQty ?? 0
    if (data.itemId && data.warehouseId) {
      const bal = await StockBalance.query()
        .where('itemId', data.itemId)
        .where('warehouseId', data.warehouseId)
        .if(data.binId, (q) => q.where('binId', data.binId))
        .if(!data.binId, (q) => q.whereNull('binId'))
        .first()
      systemQty = Number(bal?.quantity ?? 0)
    } else if (data.assetId) {
      const asset = await Asset.query()
        .where('organizationId', orgId)
        .where('id', data.assetId)
        .whereNull('deletedAt')
        .first()
      systemQty = asset ? 1 : 0
    }

    const countedQty = Number(data.countedQty)
    const line = await PhysicalCountLine.create({
      sessionId,
      itemId: data.itemId ?? null,
      assetId: data.assetId ?? null,
      warehouseId: data.warehouseId ?? session.warehouseId,
      binId: data.binId ?? null,
      systemQty,
      countedQty,
      varianceQty: countedQty - systemQty,
      condition: data.condition ?? null,
      barcodeScanned: data.barcodeScanned ?? null,
      gpsLat: data.gpsLat ?? null,
      gpsLng: data.gpsLng ?? null,
      photoUrl: data.photoUrl ?? null,
      foundUntagged: data.foundUntagged ?? false,
      scannedBy: userId,
      scannedAt: DateTime.now(),
      notes: data.notes ?? null,
    })

    await auditLogService.log({
      organizationId: orgId,
      actorUserId: userId,
      action: AuditAction.COUNT_SCAN,
      entityType: 'physical_count_line',
      entityId: line.id,
      metadata: { sessionId },
    })

    return line
  }

  async reconcile(orgId: string, sessionId: string, userId: string) {
    const session = await this.getById(orgId, sessionId)
    if (session.status === CountSessionStatus.CLOSED) {
      throw new Error('Session is already closed')
    }

    const adjustLines: Array<{
      itemId: string
      warehouseId: string
      binId?: string | null
      quantity: number
      reason: string
    }> = []

    for (const line of session.lines) {
      if (line.itemId && line.warehouseId && line.varianceQty != null && line.varianceQty !== 0) {
        adjustLines.push({
          itemId: line.itemId,
          warehouseId: line.warehouseId,
          binId: line.binId,
          quantity: Number(line.varianceQty),
          reason: `Physical count variance ${session.sessionNo}`,
        })
      }
    }

    if (adjustLines.length) {
      await stockMovementService.processAdjust(
        orgId,
        adjustLines,
        session.sessionNo,
        'Physical count reconcile',
        userId
      )
    }

    session.status = CountSessionStatus.RECONCILING
    await session.save()

    await auditLogService.log({
      organizationId: orgId,
      actorUserId: userId,
      action: AuditAction.COUNT_RECONCILE,
      entityType: 'physical_count_session',
      entityId: session.id,
      metadata: { adjustCount: adjustLines.length },
    })

    return this.getById(orgId, sessionId)
  }

  async close(orgId: string, sessionId: string, userId: string) {
    const session = await this.getById(orgId, sessionId)
    if (session.status === CountSessionStatus.CLOSED) {
      throw new Error('Session already closed')
    }

    session.status = CountSessionStatus.CLOSED
    session.closedAt = DateTime.now()
    await session.save()

    await auditLogService.log({
      organizationId: orgId,
      actorUserId: userId,
      action: AuditAction.COUNT_CLOSE,
      entityType: 'physical_count_session',
      entityId: session.id,
    })

    return session
  }
}

export const physicalCountService = new PhysicalCountService()
