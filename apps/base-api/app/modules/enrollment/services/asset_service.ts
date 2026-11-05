import { DateTime } from 'luxon'
import Asset from '#modules/enrollment/models/asset'
import AssetAssignment from '#modules/enrollment/models/asset_assignment'
import AssetLifecycleEvent from '#modules/enrollment/models/asset_lifecycle_event'
import AssetMaintenanceRecord from '#modules/enrollment/models/asset_maintenance_record'
import { AssetStatus, AuditAction } from '#modules/enrollment/domain/enums/index'
import { auditLogService } from '#modules/enrollment/services/audit_log_service'

export class AssetService {
  async list(orgId: string, page = 1, limit = 25, status?: string) {
    const q = Asset.query()
      .where('organizationId', orgId)
      .whereNull('deletedAt')
      .preload('office')
    if (status) q.where('status', status)
    return q.orderBy('name').paginate(page, limit)
  }

  async getById(orgId: string, id: string) {
    return Asset.query()
      .where('organizationId', orgId)
      .where('id', id)
      .whereNull('deletedAt')
      .preload('office')
      .preload('currentAssignment')
      .preload('assignments')
      .preload('maintenanceRecords')
      .firstOrFail()
  }

  async create(orgId: string, data: Record<string, any>, userId?: string) {
    const asset = await Asset.create({
      organizationId: orgId,
      assetCode: data.assetCode,
      propertyNumber: data.propertyNumber ?? null,
      barcode: data.barcode ?? null,
      name: data.name,
      description: data.description ?? null,
      assetType: data.assetType ?? 'equipment',
      serialNumber: data.serialNumber ?? null,
      model: data.model ?? null,
      manufacturer: data.manufacturer ?? null,
      fundSource: data.fundSource ?? null,
      officeId: data.officeId ?? null,
      purchaseDate: data.purchaseDate ?? null,
      purchaseCost: data.purchaseCost ?? null,
      warrantyExpiresAt: data.warrantyExpiresAt ?? null,
      notes: data.notes ?? null,
      status: AssetStatus.AVAILABLE,
      lifecycleStage: 'active',
      createdBy: userId ?? null,
    })

    await this.logLifecycle(orgId, asset.id, 'created', null, AssetStatus.AVAILABLE, userId)
    return asset
  }

  async update(orgId: string, id: string, data: Record<string, any>, userId?: string) {
    const asset = await Asset.query()
      .where('organizationId', orgId)
      .where('id', id)
      .whereNull('deletedAt')
      .firstOrFail()
    asset.merge({ ...data, updatedBy: userId ?? null })
    await asset.save()
    return asset
  }

  async assign(orgId: string, assetId: string, data: Record<string, any>, userId?: string) {
    const asset = await this.getById(orgId, assetId)
    if (asset.status === AssetStatus.ASSIGNED) {
      throw new Error('Asset is already assigned')
    }

    const assignment = await AssetAssignment.create({
      organizationId: orgId,
      assetId,
      custodianExternalId: data.custodianExternalId,
      custodianName: data.custodianName ?? null,
      custodianEmail: data.custodianEmail ?? null,
      assignedAt: DateTime.now(),
      assignedBy: userId ?? null,
      expectedReturnAt: data.expectedReturnAt ? DateTime.fromISO(data.expectedReturnAt) : null,
      status: 'active',
    })

    asset.status = AssetStatus.ASSIGNED
    asset.currentAssignmentId = assignment.id
    asset.custodianExternalId = data.custodianExternalId
    asset.custodianName = data.custodianName ?? null
    asset.custodianEmail = data.custodianEmail ?? null
    await asset.save()

    await this.logLifecycle(orgId, assetId, 'assigned', AssetStatus.AVAILABLE, AssetStatus.ASSIGNED, userId, {
      custodianExternalId: data.custodianExternalId,
    })

    return assignment
  }

  async returnAsset(orgId: string, assetId: string, data: Record<string, any>, userId?: string) {
    const asset = await this.getById(orgId, assetId)
    if (asset.status !== AssetStatus.ASSIGNED || !asset.currentAssignmentId) {
      throw new Error('Asset is not currently assigned')
    }

    const assignment = await AssetAssignment.findOrFail(asset.currentAssignmentId)
    assignment.returnedAt = DateTime.now()
    assignment.returnedBy = userId ?? null
    assignment.returnCondition = data.returnCondition ?? null
    assignment.returnNotes = data.returnNotes ?? null
    assignment.status = 'returned'
    await assignment.save()

    asset.status = AssetStatus.AVAILABLE
    asset.currentAssignmentId = null
    asset.custodianExternalId = null
    asset.custodianName = null
    asset.custodianEmail = null
    await asset.save()

    await this.logLifecycle(orgId, assetId, 'returned', AssetStatus.ASSIGNED, AssetStatus.AVAILABLE, userId)
    return asset
  }

  async retire(orgId: string, assetId: string, reason?: string, userId?: string) {
    const asset = await this.getById(orgId, assetId)
    const prevStatus = asset.status

    asset.status = AssetStatus.RETIRED
    asset.lifecycleStage = 'retired'
    await asset.save()

    await this.logLifecycle(orgId, assetId, 'retired', prevStatus, AssetStatus.RETIRED, userId, { reason })
    return asset
  }

  async scheduleMaintenance(orgId: string, assetId: string, data: Record<string, any>, userId?: string) {
    await this.getById(orgId, assetId)
    return AssetMaintenanceRecord.create({
      organizationId: orgId,
      assetId,
      title: data.title,
      description: data.description ?? null,
      maintenanceType: data.maintenanceType ?? 'preventive',
      scheduledAt: DateTime.fromISO(data.scheduledAt),
      assignedToUserId: data.assignedToUserId ?? null,
      cost: data.cost ?? null,
      notes: data.notes ?? null,
      status: 'scheduled',
      createdBy: userId ?? null,
    })
  }

  async completeMaintenance(orgId: string, recordId: string, data: Record<string, any>) {
    const record = await AssetMaintenanceRecord.query()
      .where('organizationId', orgId)
      .where('id', recordId)
      .firstOrFail()
    record.status = 'completed'
    record.completedAt = DateTime.now()
    if (data.cost !== undefined) record.cost = data.cost
    if (data.notes) record.notes = data.notes
    await record.save()
    return record
  }

  async getCustodianships(employeeExternalId: string) {
    return Asset.query()
      .where('custodianExternalId', employeeExternalId)
      .whereNull('deletedAt')
      .where('status', AssetStatus.ASSIGNED)
      .preload('office')
      .orderBy('name')
  }

  async softDelete(orgId: string, id: string, userId?: string) {
    const asset = await this.getById(orgId, id)
    asset.deletedAt = DateTime.now()
    await asset.save()
    await this.logLifecycle(orgId, id, 'deleted', asset.status, 'deleted', userId)
  }

  async generateQr(orgId: string, id: string, userId?: string) {
    const asset = await this.getById(orgId, id)
    const payload = {
      assetId: asset.id,
      assetCode: asset.assetCode,
      propertyNumber: asset.propertyNumber,
    }
    asset.qrPayload = JSON.stringify(payload)
    asset.updatedBy = userId ?? null
    await asset.save()

    await auditLogService.log({
      organizationId: orgId,
      actorUserId: userId,
      action: AuditAction.ASSET_QR,
      entityType: 'asset',
      entityId: asset.id,
      metadata: payload,
    })

    return asset
  }

  private async logLifecycle(
    orgId: string,
    assetId: string,
    eventType: string,
    fromStatus: string | null,
    toStatus: string,
    userId?: string | null,
    metadata?: Record<string, unknown>
  ) {
    await AssetLifecycleEvent.create({
      organizationId: orgId,
      assetId,
      eventType,
      fromStatus,
      toStatus,
      metadata: metadata ?? null,
      occurredAt: DateTime.now(),
      actorUserId: userId ?? null,
    })
  }
}

export const assetService = new AssetService()
