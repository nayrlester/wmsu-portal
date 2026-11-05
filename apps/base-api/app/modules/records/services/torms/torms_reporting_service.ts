import db from '@adonisjs/lucid/services/db'
import { t } from '#modules/records/helpers/db_schema'
import { auditLogService } from '#modules/records/services/audit_log_service'

type DateFilter = { from?: string | null; to?: string | null }

function applyDate(q: ReturnType<typeof db.from>, column: string, filter: DateFilter) {
  if (filter.from) q.andWhere(column, '>=', filter.from)
  if (filter.to) q.andWhere(column, '<=', filter.to)
  return q
}

async function countBy(
  table: string,
  organizationId: string,
  column: string,
  filter: DateFilter,
  dateColumn = 'requested_at'
) {
  let q = db
    .from(t(table))
    .where('organization_id', organizationId)
    .whereNotNull(column)
  applyDate(q, dateColumn, filter)
  const rows = await q.select(column).count('* as total').groupBy(column)
  const out: Record<string, number> = {}
  for (const row of rows) {
    const key = String((row as Record<string, unknown>)[column] ?? 'unknown')
    out[key] = Number((row as { total?: number | string }).total ?? 0)
  }
  return out
}

async function avgProcessingHours(
  table: string,
  organizationId: string,
  filter: DateFilter
) {
  let q = db
    .from(t(table))
    .where('organization_id', organizationId)
    .whereIn('status', ['approved', 'released'])
    .whereNotNull('requested_at')
  applyDate(q, 'requested_at', filter)
  const rows = await q.select('requested_at', 'released_at', 'updated_at', 'status')
  if (!rows.length) return null
  let sum = 0
  let n = 0
  for (const row of rows) {
    const start = new Date(String(row.requested_at)).getTime()
    const endRaw =
      row.status === 'released' && row.released_at ? row.released_at : row.updated_at
    if (!endRaw) continue
    const end = new Date(String(endRaw)).getTime()
    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) continue
    sum += (end - start) / 3_600_000
    n += 1
  }
  if (!n) return null
  return Math.round((sum / n) * 100) / 100
}

function trendBucket(date: Date) {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

async function dailyTrend(
  table: string,
  organizationId: string,
  filter: DateFilter
) {
  let q = db.from(t(table)).where('organization_id', organizationId)
  applyDate(q, 'requested_at', filter)
  const rows = await q.select('requested_at')
  const buckets: Record<string, number> = {}
  for (const row of rows) {
    if (!row.requested_at) continue
    const key = trendBucket(new Date(String(row.requested_at)))
    buckets[key] = (buckets[key] ?? 0) + 1
  }
  return Object.entries(buckets)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }))
}

export class TormsReportingService {
  async dashboardSummary(input: {
    organizationId: string
    actorUserId: string
    from?: string | null
    to?: string | null
    locality?: string | null
  }) {
    const filter: DateFilter = { from: input.from, to: input.to }

    const torBase = () => {
      let q = db.from(t('tor_requests')).where('organization_id', input.organizationId)
      applyDate(q, 'requested_at', filter)
      if (input.locality) q.andWhere('locality', input.locality)
      return q
    }
    const certBase = () => {
      let q = db.from(t('certification_requests')).where('organization_id', input.organizationId)
      applyDate(q, 'requested_at', filter)
      if (input.locality) q.andWhere('locality', input.locality)
      return q
    }

    const torTotal = Number((await torBase().count('* as total').first())?.total ?? 0)
    const certTotal = Number((await certBase().count('* as total').first())?.total ?? 0)

    const torByStatus = await countBy('tor_requests', input.organizationId, 'status', filter)
    const certByStatus = await countBy(
      'certification_requests',
      input.organizationId,
      'status',
      filter
    )
    const torLocality = await countBy('tor_requests', input.organizationId, 'locality', filter)
    const certLocality = await countBy(
      'certification_requests',
      input.organizationId,
      'locality',
      filter
    )
    const torClearance = await countBy(
      'tor_requests',
      input.organizationId,
      'clearance_status',
      filter
    )
    const certClearance = await countBy(
      'certification_requests',
      input.organizationId,
      'clearance_status',
      filter
    )
    const torPayment = await countBy(
      'tor_requests',
      input.organizationId,
      'payment_status',
      filter
    )
    const certPayment = await countBy(
      'certification_requests',
      input.organizationId,
      'payment_status',
      filter
    )

    const backlogStatuses = ['pending', 'processing']
    const torBacklog = backlogStatuses.reduce((s, k) => s + (torByStatus[k] ?? 0), 0)
    const certBacklog = backlogStatuses.reduce((s, k) => s + (certByStatus[k] ?? 0), 0)

    let torIssuedQ = db
      .from(t('transcript_issuances'))
      .where('organization_id', input.organizationId)
      .whereNotNull('issued_at')
    if (filter.from) torIssuedQ = torIssuedQ.andWhere('issued_at', '>=', filter.from)
    if (filter.to) torIssuedQ = torIssuedQ.andWhere('issued_at', '<=', filter.to)
    const torIssued = Number((await torIssuedQ.count('* as total').first())?.total ?? 0)

    let certIssuedQ = db
      .from(t('certification_issuances'))
      .where('organization_id', input.organizationId)
      .whereNotNull('issued_at')
    if (filter.from) certIssuedQ = certIssuedQ.andWhere('issued_at', '>=', filter.from)
    if (filter.to) certIssuedQ = certIssuedQ.andWhere('issued_at', '<=', filter.to)
    const certIssued = Number((await certIssuedQ.count('* as total').first())?.total ?? 0)

    const alumniTotal = Number(
      (
        await db
          .from(t('alumni_profiles'))
          .where('organization_id', input.organizationId)
          .count('* as total')
          .first()
      )?.total ?? 0
    )

    const unpaidLike = (map: Record<string, number>) =>
      (map.Unpaid ?? 0) +
      (map.unpaid ?? 0) +
      (map['Pending Verification'] ?? 0) +
      (map.pending_verification ?? 0)

    const summary = {
      generatedAt: new Date().toISOString(),
      filters: { from: filter.from ?? null, to: filter.to ?? null, locality: input.locality ?? null },
      indicators: {
        transcriptRequestsTotal: torTotal,
        transcriptRequestsByStatus: torByStatus,
        transcriptBacklog: torBacklog,
        transcriptIssued: torIssued,
        transcriptReleased: torByStatus.released ?? 0,
        transcriptLocality: torLocality,
        transcriptClearance: torClearance,
        transcriptPayment: torPayment,
        transcriptAvgProcessingHours: await avgProcessingHours(
          'tor_requests',
          input.organizationId,
          filter
        ),
        certificationRequestsTotal: certTotal,
        certificationRequestsByStatus: certByStatus,
        certificationBacklog: certBacklog,
        certificationIssued: certIssued,
        certificationReleased: certByStatus.released ?? 0,
        certificationLocality: certLocality,
        certificationClearance: certClearance,
        certificationPayment: certPayment,
        certificationAvgProcessingHours: await avgProcessingHours(
          'certification_requests',
          input.organizationId,
          filter
        ),
        incompleteClearanceCount:
          (torClearance['With Deficiency'] ?? 0) +
          (torClearance.unavailable ?? 0) +
          (certClearance['With Deficiency'] ?? 0) +
          (certClearance.unavailable ?? 0),
        unpaidOrPendingPaymentCount: unpaidLike(torPayment) + unpaidLike(certPayment),
        alumniProfilesTotal: alumniTotal,
      },
      trends: {
        transcriptRequestsDaily: await dailyTrend('tor_requests', input.organizationId, filter),
        certificationRequestsDaily: await dailyTrend(
          'certification_requests',
          input.organizationId,
          filter
        ),
      },
      exclusions: {
        tracerEmploymentIndicators: 'Not implemented — TOR-031/018 CHED field set FC #18',
        eventsDonationsEngagement: 'Not implemented — TOR-015–020 require additional modules',
        anomalyAlerts: 'Not implemented — TOR-030 thresholds FC #21',
        loadUnder3Seconds: 'Not claimed — FC #25',
      },
      calculationNotes: {
        avgProcessingHours:
          'Mean hours from requested_at to released_at (if released) else updated_at for approved/released rows only',
        backlog: 'Count of requests in pending or processing',
        source: 'Live TORMS request and issuance tables; no fabricated KPIs',
      },
    }

    await auditLogService.log({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: 'torms.dashboard.viewed',
      entityType: 'torms_dashboard',
      entityId: input.organizationId,
      metadata: { from: filter.from ?? null, to: filter.to ?? null },
    })

    return summary
  }

  async requestReport(input: {
    organizationId: string
    actorUserId: string
    kind: 'transcript' | 'certification'
    status?: string | null
    locality?: string | null
    certificationType?: string | null
    from?: string | null
    to?: string | null
    limit?: number
    offset?: number
  }) {
    const table = input.kind === 'transcript' ? 'tor_requests' : 'certification_requests'
    const limit = Math.min(Math.max(input.limit ?? 50, 1), 500)
    const offset = Math.max(input.offset ?? 0, 0)
    let q = db.from(t(table)).where('organization_id', input.organizationId)
    applyDate(q, 'requested_at', { from: input.from, to: input.to })
    if (input.status) q.andWhere('status', input.status)
    if (input.locality) q.andWhere('locality', input.locality)
    if (input.kind === 'certification' && input.certificationType) {
      q.andWhere('certification_type', input.certificationType)
    }

    const total = Number((await q.clone().count('* as total').first())?.total ?? 0)
    const rows = await q
      .clone()
      .orderBy('requested_at', 'desc')
      .limit(limit)
      .offset(offset)

    await auditLogService.log({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: 'torms.report.requests',
      entityType: 'torms_report',
      entityId: null,
      metadata: { kind: input.kind, total, status: input.status ?? null },
    })

    return {
      kind: input.kind,
      items: rows,
      meta: { total, limit, offset },
      filters: {
        status: input.status ?? null,
        locality: input.locality ?? null,
        certificationType: input.certificationType ?? null,
        from: input.from ?? null,
        to: input.to ?? null,
      },
    }
  }

  async issuanceReport(input: {
    organizationId: string
    actorUserId: string
    kind: 'transcript' | 'certification'
    from?: string | null
    to?: string | null
    limit?: number
    offset?: number
  }) {
    const table =
      input.kind === 'transcript' ? 'transcript_issuances' : 'certification_issuances'
    const limit = Math.min(Math.max(input.limit ?? 50, 1), 500)
    const offset = Math.max(input.offset ?? 0, 0)
    let q = db
      .from(t(table))
      .where('organization_id', input.organizationId)
      .andWhere('issuance_status', 'issued')
    if (input.from) q.andWhere('issued_at', '>=', input.from)
    if (input.to) q.andWhere('issued_at', '<=', input.to)
    const total = Number((await q.clone().count('* as total').first())?.total ?? 0)
    const rows = await q.clone().orderBy('issued_at', 'desc').limit(limit).offset(offset)

    await auditLogService.log({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: 'torms.report.issuances',
      entityType: 'torms_report',
      entityId: null,
      metadata: { kind: input.kind, total },
    })

    return { kind: input.kind, items: rows, meta: { total, limit, offset } }
  }

  toCsv(rows: Array<Record<string, unknown>>, columns: string[]) {
    const escape = (v: unknown) => {
      const s = v === null || v === undefined ? '' : String(v)
      if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
      return s
    }
    const header = columns.join(',')
    const lines = rows.map((r) => columns.map((c) => escape(r[c])).join(','))
    return [header, ...lines].join('\n')
  }
}

export const tormsReportingService = new TormsReportingService()
