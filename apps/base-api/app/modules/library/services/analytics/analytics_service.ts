import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import Book from '#modules/library/models/book'
import BookCopy from '#modules/library/models/book_copy'
import Member from '#modules/library/models/member'
import Borrowing from '#modules/library/models/borrowing'
import Reservation from '#modules/library/models/reservation'
import AttendanceEvent from '#modules/library/models/attendance_event'
import { t } from '#modules/library/helpers/db_schema'
import { tenantContext } from '#modules/library/services/tenant/tenant_context'
import CacheService from '#modules/library/services/cache/cache_service'

export interface AnalyticsDashboardInput {
  days?: number
}

function tenantId(): string {
  return tenantContext.get().id
}

export default class AnalyticsService {
  private cache = new CacheService()

  async getDashboard(input: AnalyticsDashboardInput = {}) {
    const days = Math.min(Math.max(input.days ?? 30, 7), 90)
    const tid = tenantId()

    return this.cache.remember(
      `analytics:dashboard:v2:${days}`,
      60,
      async () => {
        const since = DateTime.now().minus({ days }).startOf('day')

        const [
          overview,
          circulationTrends,
          topBooks,
          statusBreakdown,
          subjectStats,
          materialTypeStats,
          topSearchTerms,
          peakUsageHours,
          acquisitionSummary,
          digitalUsageSummary,
        ] = await Promise.all([
          this.getOverview(tid),
          this.getCirculationTrends(tid, since),
          this.getTopBooks(tid, 10),
          this.getBorrowingStatusBreakdown(tid),
          this.getSubjectStats(tid),
          this.getMaterialTypeStats(tid),
          this.getTopSearchTerms(tid, since),
          this.getPeakUsageHours(tid, since),
          this.getAcquisitionSummary(tid),
          this.getDigitalUsageSummary(tid),
        ])

        return {
          overview,
          circulationTrends,
          topBooks,
          statusBreakdown,
          subjectStats,
          materialTypeStats,
          topSearchTerms,
          peakUsageHours,
          acquisitionSummary,
          digitalUsageSummary,
          period: { days, from: since.toISO(), to: DateTime.now().toISO() },
        }
      },
      tid
    )
  }

  private async getOverview(tid: string) {
    const booksResult = await Book.query()
      .where('tenant_id', tid)
      .whereNull('deleted_at')
      .count('* as total')
      .first()

    const copiesResult = await BookCopy.query()
      .where('tenant_id', tid)
      .whereNull('deleted_at')
      .count('* as total')
      .first()

    const availableCopiesResult = await BookCopy.query()
      .where('tenant_id', tid)
      .whereNull('deleted_at')
      .where('status', 'available')
      .count('* as total')
      .first()

    const activeMembersResult = await Member.query()
      .where('tenant_id', tid)
      .where('membership_status', 'approved')
      .whereNull('deleted_at')
      .count('* as total')
      .first()

    const borrowedResult = await Borrowing.query()
      .where('tenant_id', tid)
      .whereIn('status', ['borrowed', 'overdue'])
      .count('* as total')
      .first()

    const overdueResult = await Borrowing.query()
      .where('tenant_id', tid)
      .where('status', 'overdue')
      .count('* as total')
      .first()

    const activeReservationsResult = await Reservation.query()
      .where('tenant_id', tid)
      .whereIn('status', ['pending', 'ready'])
      .count('* as total')
      .first()

    const returnedThisMonth = await Borrowing.query()
      .where('tenant_id', tid)
      .where('status', 'returned')
      .where('returned_at', '>=', DateTime.now().startOf('month').toSQL()!)
      .count('* as total')
      .first()

    const checkoutsThisMonth = await Borrowing.query()
      .where('tenant_id', tid)
      .whereNotNull('borrowed_at')
      .where('borrowed_at', '>=', DateTime.now().startOf('month').toSQL()!)
      .count('* as total')
      .first()

    const attendanceToday = await AttendanceEvent.query()
      .where('tenant_id', tid)
      .where('occurred_at', '>=', DateTime.now().startOf('day').toSQL()!)
      .where('occurred_at', '<=', DateTime.now().endOf('day').toSQL()!)
      .count('* as total')
      .first()

    return {
      totalBooks: Number(booksResult?.$extras.total ?? 0),
      totalCopies: Number(copiesResult?.$extras.total ?? 0),
      availableCopies: Number(availableCopiesResult?.$extras.total ?? 0),
      activeMembers: Number(activeMembersResult?.$extras.total ?? 0),
      activeLoans: Number(borrowedResult?.$extras.total ?? 0),
      overdue: Number(overdueResult?.$extras.total ?? 0),
      activeReservations: Number(activeReservationsResult?.$extras.total ?? 0),
      checkoutsThisMonth: Number(checkoutsThisMonth?.$extras.total ?? 0),
      returnsThisMonth: Number(returnedThisMonth?.$extras.total ?? 0),
      attendanceToday: Number(attendanceToday?.$extras.total ?? 0),
    }
  }

  private async getCirculationTrends(tid: string, since: DateTime) {
    const checkouts = await db.rawQuery(
      `
      SELECT to_char(date_trunc('day', borrowed_at), 'YYYY-MM-DD') AS date,
             COUNT(*)::int AS count
      FROM ${t('borrowings')}
      WHERE tenant_id = ?
        AND borrowed_at IS NOT NULL
        AND borrowed_at >= ?
      GROUP BY date_trunc('day', borrowed_at)
      ORDER BY date_trunc('day', borrowed_at) ASC
      `,
      [tid, since.toSQL()]
    )

    const returns = await db.rawQuery(
      `
      SELECT to_char(date_trunc('day', returned_at), 'YYYY-MM-DD') AS date,
             COUNT(*)::int AS count
      FROM ${t('borrowings')}
      WHERE tenant_id = ?
        AND returned_at IS NOT NULL
        AND returned_at >= ?
      GROUP BY date_trunc('day', returned_at)
      ORDER BY date_trunc('day', returned_at) ASC
      `,
      [tid, since.toSQL()]
    )

    const reservations = await db.rawQuery(
      `
      SELECT to_char(date_trunc('day', reserved_at), 'YYYY-MM-DD') AS date,
             COUNT(*)::int AS count
      FROM ${t('reservations')}
      WHERE tenant_id = ?
        AND reserved_at >= ?
      GROUP BY date_trunc('day', reserved_at)
      ORDER BY date_trunc('day', reserved_at) ASC
      `,
      [tid, since.toSQL()]
    )

    const dateMap = new Map<string, { date: string; checkouts: number; returns: number; reservations: number }>()

    for (const row of checkouts.rows as Array<{ date: string; count: number }>) {
      dateMap.set(row.date, {
        date: row.date,
        checkouts: row.count,
        returns: 0,
        reservations: 0,
      })
    }

    for (const row of returns.rows as Array<{ date: string; count: number }>) {
      const existing = dateMap.get(row.date) ?? {
        date: row.date,
        checkouts: 0,
        returns: 0,
        reservations: 0,
      }
      existing.returns = row.count
      dateMap.set(row.date, existing)
    }

    for (const row of reservations.rows as Array<{ date: string; count: number }>) {
      const existing = dateMap.get(row.date) ?? {
        date: row.date,
        checkouts: 0,
        returns: 0,
        reservations: 0,
      }
      existing.reservations = row.count
      dateMap.set(row.date, existing)
    }

    return [...dateMap.values()].sort((a, b) => a.date.localeCompare(b.date))
  }

  private async getTopBooks(tid: string, limit: number) {
    const result = await db.rawQuery(
      `
      SELECT b.id AS book_id,
             b.title,
             b.author_names,
             COUNT(br.id)::int AS loan_count,
             COUNT(br.id) FILTER (WHERE br.status IN ('borrowed', 'overdue'))::int AS active_loans
      FROM ${t('borrowings as br')}
      INNER JOIN ${t('books as b')} ON b.id = br.book_id
      WHERE br.tenant_id = ?
        AND b.deleted_at IS NULL
        AND br.status IN ('borrowed', 'returned', 'overdue', 'lost')
      GROUP BY b.id, b.title, b.author_names
      ORDER BY loan_count DESC, b.title ASC
      LIMIT ?
      `,
      [tid, limit]
    )

    return (result.rows as Array<Record<string, unknown>>).map((row) => ({
      bookId: row.book_id as string,
      title: row.title as string,
      authorNames: (row.author_names as string) ?? null,
      loanCount: Number(row.loan_count),
      activeLoans: Number(row.active_loans),
    }))
  }

  private async getBorrowingStatusBreakdown(tid: string) {
    const rows = await Borrowing.query()
      .where('tenant_id', tid)
      .select('status')
      .count('* as total')
      .groupBy('status')

    const breakdown: Record<string, number> = {}
    for (const row of rows) {
      breakdown[row.status] = Number(row.$extras.total ?? 0)
    }

    return breakdown
  }

  private async getSubjectStats(tid: string) {
    const result = await db.rawQuery(
      `
      SELECT COALESCE(s.name, '(unassigned)') AS subject,
             COUNT(DISTINCT b.id)::int AS title_count
      FROM ${t('books as b')}
      LEFT JOIN ${t('book_subjects as bs')} ON bs.book_id = b.id
      LEFT JOIN ${t('subjects as s')} ON s.id = bs.subject_id
      WHERE b.tenant_id = ? AND b.deleted_at IS NULL
      GROUP BY COALESCE(s.name, '(unassigned)')
      ORDER BY title_count DESC, subject ASC
      LIMIT 15
      `,
      [tid]
    )
    return (result.rows as Array<{ subject: string; title_count: number }>).map((row) => ({
      subject: row.subject,
      titleCount: Number(row.title_count),
    }))
  }

  private async getMaterialTypeStats(tid: string) {
    const result = await db.rawQuery(
      `
      SELECT COALESCE(material_type, 'unspecified') AS material_type,
             COUNT(*)::int AS title_count
      FROM ${t('books')}
      WHERE tenant_id = ? AND deleted_at IS NULL
      GROUP BY COALESCE(material_type, 'unspecified')
      ORDER BY title_count DESC
      `,
      [tid]
    )
    return (result.rows as Array<{ material_type: string; title_count: number }>).map((row) => ({
      materialType: row.material_type,
      titleCount: Number(row.title_count),
    }))
  }

  private async getTopSearchTerms(tid: string, since: DateTime) {
    const result = await db.rawQuery(
      `
      SELECT query, COUNT(*)::int AS search_count
      FROM ${t('recent_searches')}
      WHERE tenant_id = ?
        AND searched_at >= ?
        AND TRIM(query) <> ''
      GROUP BY query
      ORDER BY search_count DESC, query ASC
      LIMIT 10
      `,
      [tid, since.toSQL()]
    )
    return (result.rows as Array<{ query: string; search_count: number }>).map((row) => ({
      query: row.query,
      searchCount: Number(row.search_count),
    }))
  }

  private async getPeakUsageHours(tid: string, since: DateTime) {
    const result = await db.rawQuery(
      `
      SELECT EXTRACT(HOUR FROM occurred_at)::int AS hour_of_day,
             COUNT(*)::int AS event_count
      FROM ${t('attendance_events')}
      WHERE tenant_id = ?
        AND occurred_at >= ?
      GROUP BY EXTRACT(HOUR FROM occurred_at)
      ORDER BY hour_of_day ASC
      `,
      [tid, since.toSQL()]
    )
    return (result.rows as Array<{ hour_of_day: number; event_count: number }>).map((row) => ({
      hour: Number(row.hour_of_day),
      eventCount: Number(row.event_count),
    }))
  }

  private async getAcquisitionSummary(tid: string) {
    const result = await db.rawQuery(
      `
      SELECT status, COUNT(*)::int AS total
      FROM ${t('acquisition_requests')}
      WHERE tenant_id = ?
      GROUP BY status
      `,
      [tid]
    )
    const byStatus: Record<string, number> = {}
    let total = 0
    for (const row of result.rows as Array<{ status: string; total: number }>) {
      byStatus[row.status] = Number(row.total)
      total += Number(row.total)
    }
    return {
      total,
      byStatus,
      pendingRoute: Number(byStatus.submitted ?? 0),
      routed: Number(byStatus.routed ?? 0) + Number(byStatus.acknowledged ?? 0),
      cataloged: Number(byStatus.cataloged ?? 0),
    }
  }

  private async getDigitalUsageSummary(tid: string) {
    const result = await db.rawQuery(
      `
      SELECT COUNT(*)::int AS item_count,
             COALESCE(SUM(download_count), 0)::int AS download_total,
             COALESCE(SUM(view_count), 0)::int AS view_total
      FROM ${t('digital_repository_items')}
      WHERE tenant_id = ?
      `,
      [tid]
    )
    const row = (result.rows as Array<Record<string, number>>)[0] ?? {}
    return {
      itemCount: Number(row.item_count ?? 0),
      downloadTotal: Number(row.download_total ?? 0),
      viewTotal: Number(row.view_total ?? 0),
    }
  }
}
