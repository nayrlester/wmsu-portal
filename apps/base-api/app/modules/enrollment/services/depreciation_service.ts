import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import Asset from '#modules/enrollment/models/asset'
import AssetDepreciationProfile from '#modules/enrollment/models/asset_depreciation_profile'
import AssetDepreciationEntry from '#modules/enrollment/models/asset_depreciation_entry'
import PropertyLedgerEntry from '#modules/enrollment/models/property_ledger_entry'
import { AuditAction } from '#modules/enrollment/domain/enums/index'
import { auditLogService } from '#modules/enrollment/services/audit_log_service'

export class DepreciationService {
  async createProfile(orgId: string, data: Record<string, any>, userId: string) {
    const asset = await Asset.query()
      .where('organizationId', orgId)
      .where('id', data.assetId)
      .whereNull('deletedAt')
      .firstOrFail()

    const residualRate = data.residualRate ?? 0.05
    const acquisitionCost = Number(data.acquisitionCost)
    const bookValue = acquisitionCost

    const profile = await AssetDepreciationProfile.create({
      organizationId: orgId,
      assetId: asset.id,
      method: data.method ?? 'straight_line',
      usefulLifeMonths: data.usefulLifeMonths,
      residualRate,
      acquisitionCost,
      inServiceDate: DateTime.fromISO(String(data.inServiceDate)),
      accumDepr: 0,
      bookValue,
      active: true,
    })

    asset.usefulLifeMonths = data.usefulLifeMonths
    asset.residualRate = residualRate
    if (!asset.purchaseCost) asset.purchaseCost = acquisitionCost
    await asset.save()

    await PropertyLedgerEntry.create({
      organizationId: orgId,
      assetId: asset.id,
      entryType: 'acquisition',
      reference: asset.assetCode,
      debit: acquisitionCost,
      credit: 0,
      balanceAfter: acquisitionCost,
      narrative: 'Depreciation profile created — acquisition cost',
      createdBy: userId,
      occurredAt: DateTime.now(),
    })

    await auditLogService.log({
      organizationId: orgId,
      actorUserId: userId,
      action: AuditAction.DEPRECIATION_PROFILE,
      entityType: 'asset_depreciation_profile',
      entityId: profile.id,
      metadata: { assetId: asset.id },
    })

    return profile
  }

  async runPeriod(orgId: string, periodYear: number, periodMonth: number, userId: string, assetId?: string) {
    return db.transaction(async (trx) => {
      const q = AssetDepreciationProfile.query({ client: trx })
        .where('organizationId', orgId)
        .where('active', true)
      if (assetId) q.where('assetId', assetId)
      const profiles = await q

      const posted: AssetDepreciationEntry[] = []

      for (const profile of profiles) {
        const existing = await AssetDepreciationEntry.query({ client: trx })
          .where('assetId', profile.assetId)
          .where('periodYear', periodYear)
          .where('periodMonth', periodMonth)
          .first()
        if (existing) continue

        const residualValue = Number(profile.acquisitionCost) * Number(profile.residualRate)
        const depreciable = Number(profile.acquisitionCost) - residualValue
        const monthly = profile.usefulLifeMonths > 0 ? depreciable / profile.usefulLifeMonths : 0
        const remaining = Number(profile.bookValue) - residualValue
        if (remaining <= 0 || monthly <= 0) {
          profile.active = false
          await profile.useTransaction(trx).save()
          continue
        }

        const deprAmount = Math.min(monthly, remaining)
        const accumDeprAfter = Number(profile.accumDepr) + deprAmount
        const bookValueAfter = Number(profile.bookValue) - deprAmount

        const entry = await AssetDepreciationEntry.create(
          {
            organizationId: orgId,
            profileId: profile.id,
            assetId: profile.assetId,
            periodYear,
            periodMonth,
            deprAmount,
            accumDeprAfter,
            bookValueAfter,
            postedAt: DateTime.now(),
          },
          { client: trx }
        )

        profile.accumDepr = accumDeprAfter
        profile.bookValue = bookValueAfter
        if (bookValueAfter <= residualValue + 0.01) profile.active = false
        await profile.useTransaction(trx).save()

        await PropertyLedgerEntry.create(
          {
            organizationId: orgId,
            assetId: profile.assetId,
            entryType: 'depreciation',
            reference: `${periodYear}-${String(periodMonth).padStart(2, '0')}`,
            debit: 0,
            credit: deprAmount,
            balanceAfter: bookValueAfter,
            narrative: `Monthly depreciation ${periodYear}-${periodMonth}`,
            createdBy: userId,
            occurredAt: DateTime.now(),
          },
          { client: trx }
        )

        posted.push(entry)
      }

      await auditLogService.log({
        organizationId: orgId,
        actorUserId: userId,
        action: AuditAction.DEPRECIATION_RUN,
        entityType: 'asset_depreciation_entry',
        entityId: null,
        metadata: { periodYear, periodMonth, posted: posted.length },
      })

      return posted
    })
  }

  async lapsingSchedule(orgId: string, assetId: string) {
    const profile = await AssetDepreciationProfile.query()
      .where('organizationId', orgId)
      .where('assetId', assetId)
      .preload('entries', (eq) => eq.orderBy('periodYear').orderBy('periodMonth'))
      .preload('asset')
      .firstOrFail()

    const residualValue = Number(profile.acquisitionCost) * Number(profile.residualRate)
    const depreciable = Number(profile.acquisitionCost) - residualValue
    const monthly = profile.usefulLifeMonths > 0 ? depreciable / profile.usefulLifeMonths : 0

    const schedule: Array<{
      periodYear: number
      periodMonth: number
      deprAmount: number
      accumDepr: number
      bookValue: number
      posted: boolean
    }> = []

    let start = (
      DateTime.isDateTime(profile.inServiceDate)
        ? profile.inServiceDate
        : DateTime.fromISO(String(profile.inServiceDate))
    ).startOf('month')
    let accum = 0
    let book = Number(profile.acquisitionCost)
    const postedKeys = new Set(
      (profile.entries ?? []).map((e) => `${e.periodYear}-${e.periodMonth}`)
    )

    for (let i = 0; i < profile.usefulLifeMonths; i++) {
      const period = start.plus({ months: i })
      const year = period.year
      const month = period.month
      const remaining = book - residualValue
      const depr = Math.min(monthly, Math.max(0, remaining))
      accum += depr
      book -= depr
      schedule.push({
        periodYear: year,
        periodMonth: month,
        deprAmount: Math.round(depr * 100) / 100,
        accumDepr: Math.round(accum * 100) / 100,
        bookValue: Math.round(book * 100) / 100,
        posted: postedKeys.has(`${year}-${month}`),
      })
    }

    return { profile, schedule }
  }

  async listPropertyLedger(orgId: string, assetId?: string, page = 1, limit = 50) {
    const q = PropertyLedgerEntry.query().where('organizationId', orgId).preload('asset')
    if (assetId) q.where('assetId', assetId)
    return q.orderBy('occurredAt', 'desc').paginate(page, limit)
  }

  async getProfile(orgId: string, assetId: string) {
    return AssetDepreciationProfile.query()
      .where('organizationId', orgId)
      .where('assetId', assetId)
      .preload('entries')
      .preload('asset')
      .firstOrFail()
  }
}

export const depreciationService = new DepreciationService()
