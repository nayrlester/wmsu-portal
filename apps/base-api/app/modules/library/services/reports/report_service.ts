import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import { borrowingTenantId } from '#modules/library/services/borrowing/borrowing_helpers'
import { formatMoneyFromCents } from '#modules/library/helpers/currency'
import { buildReportPdf } from '#modules/library/services/reports/report_pdf'

export type ReportType =
  | 'collections'
  | 'collection_by_type'
  | 'collection_by_subject'
  | 'copy_status'
  | 'borrowed'
  | 'overdue'
  | 'most_borrowed'
  | 'book_ledger'
  | 'patron_ledger'
  | 'charges'
  | 'acquisitions'
  | 'search_terms'
  | 'digital_usage'
  | 'user_activity'

export const REPORT_TYPE_META: Array<{
  type: ReportType
  label: string
  tor: string[]
  description: string
}> = [
  {
    type: 'collections',
    label: 'Catalog inventory',
    tor: ['LIB-013', 'LIB-029'],
    description: 'Titles with copy counts and availability',
  },
  {
    type: 'collection_by_type',
    label: 'Collection by material type',
    tor: ['LIB-012', 'LIB-013'],
    description: 'Bibliographic counts grouped by material_type',
  },
  {
    type: 'collection_by_subject',
    label: 'Collection by subject',
    tor: ['LIB-012'],
    description: 'Bibliographic counts grouped by subject authority',
  },
  {
    type: 'copy_status',
    label: 'Physical item status',
    tor: ['LIB-013'],
    description: 'Copy counts by circulation status',
  },
  {
    type: 'borrowed',
    label: 'Borrowing transactions',
    tor: ['LIB-013', 'LIB-029'],
    description: 'Checkout/return/lost transactions in period',
  },
  {
    type: 'overdue',
    label: 'Overdue materials',
    tor: ['LIB-013', 'LIB-016'],
    description: 'Active overdue loans with days overdue',
  },
  {
    type: 'most_borrowed',
    label: 'Most-borrowed materials',
    tor: ['LIB-016', 'LIB-029'],
    description: 'Titles ranked by completed and active loan counts',
  },
  {
    type: 'book_ledger',
    label: 'Book circulation ledger',
    tor: ['LIB-013'],
    description: 'Per-title transaction history',
  },
  {
    type: 'patron_ledger',
    label: 'Patron circulation ledger',
    tor: ['LIB-013'],
    description: 'Per-patron transaction history (PII)',
  },
  {
    type: 'charges',
    label: 'Assessed charges',
    tor: ['LIB-007', 'LIB-029'],
    description: 'ULMIS fine assessments (not UFMS payments)',
  },
  {
    type: 'acquisitions',
    label: 'Acquisition requests',
    tor: ['LIB-008', 'LIB-029'],
    description: 'Library acquisition requests and UFMS PR refs',
  },
  {
    type: 'search_terms',
    label: 'Search-term statistics',
    tor: ['LIB-012', 'LIB-016'],
    description: 'Most frequent OPAC/staff search queries',
  },
  {
    type: 'digital_usage',
    label: 'Digital resource usage',
    tor: ['LIB-029'],
    description: 'Repository items with recorded download counts',
  },
  {
    type: 'user_activity',
    label: 'User activity (attendance)',
    tor: ['LIB-029'],
    description: 'Library attendance events by day',
  },
]

export interface ReportFilters {
  from?: string
  to?: string
  format?: 'json' | 'csv' | 'pdf' | 'xlsx'
  status?: string
  page?: number
  perPage?: number
}

export default class ReportService {
  async generate(type: ReportType, filters: ReportFilters = {}) {
    const tid = borrowingTenantId()
    const from = filters.from ? DateTime.fromISO(filters.from).startOf('day') : null
    const to = filters.to ? DateTime.fromISO(filters.to).endOf('day') : null

    switch (type) {
      case 'collections':
        return this.collectionsReport(tid)
      case 'collection_by_type':
        return this.collectionByType(tid)
      case 'collection_by_subject':
        return this.collectionBySubject(tid)
      case 'copy_status':
        return this.copyStatusReport(tid)
      case 'borrowed':
        return this.borrowedReport(tid, from, to)
      case 'overdue':
        return this.overdueReport(tid)
      case 'most_borrowed':
        return this.mostBorrowedReport(tid, from, to)
      case 'book_ledger':
        return this.bookLedger(tid, from, to)
      case 'patron_ledger':
        return this.patronLedger(tid, from, to)
      case 'charges':
        return this.chargesReport(tid, from, to)
      case 'acquisitions':
        return this.acquisitionsReport(tid, from, to, filters.status)
      case 'search_terms':
        return this.searchTermsReport(tid, from, to)
      case 'digital_usage':
        return this.digitalUsageReport(tid)
      case 'user_activity':
        return this.userActivityReport(tid, from, to)
      default:
        throw new Error(`Unknown report type: ${type}`)
    }
  }

  paginateRows(rows: Record<string, unknown>[], page = 1, perPage = 50) {
    const safePage = Math.max(1, page)
    const safePer = Math.min(Math.max(1, perPage), 200)
    const total = rows.length
    const start = (safePage - 1) * safePer
    return {
      rows: rows.slice(start, start + safePer),
      meta: {
        total,
        page: safePage,
        perPage: safePer,
        lastPage: Math.max(1, Math.ceil(total / safePer)),
      },
    }
  }

  toCsv(rows: Record<string, unknown>[]) {
    if (!rows.length) return ''
    const headers = Object.keys(rows[0])
    const escape = (value: unknown) => {
      const text = value == null ? '' : String(value)
      if (text.includes(',') || text.includes('"') || text.includes('\n')) {
        return `"${text.replace(/"/g, '""')}"`
      }
      return text
    }
    const lines = [headers.join(',')]
    for (const row of rows) {
      lines.push(headers.map((h) => escape(row[h])).join(','))
    }
    return lines.join('\n')
  }

  toPdf(
    title: string,
    rows: Record<string, unknown>[],
    opts: { subtitle?: string; from?: string; to?: string } = {}
  ) {
    const periodParts: string[] = []
    if (opts.from) periodParts.push(`From ${opts.from}`)
    if (opts.to) periodParts.push(`To ${opts.to}`)
    const period = periodParts.length ? periodParts.join(' | ') : 'All dates'
    const subtitle = opts.subtitle ? `${opts.subtitle} | ${period}` : period

    return buildReportPdf({
      title,
      subtitle,
      rows,
    })
  }

  async toXlsx(sheetName: string, rows: Record<string, unknown>[]) {
    const XLSX = await import('xlsx')
    const sheet = XLSX.utils.json_to_sheet(rows.length ? rows : [{ notice: 'No rows' }])
    const book = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(book, sheet, sheetName.slice(0, 31))
    return XLSX.write(book, { type: 'buffer', bookType: 'xlsx' }) as Buffer
  }

  private async collectionsReport(tenantId: string) {
    const result = await db.rawQuery(
      `
      SELECT b.title, b.isbn13, b.author_names AS authors, b.material_type,
             c.name AS category,
             COUNT(bc.id) AS copy_count,
             COUNT(bc.id) FILTER (WHERE bc.status = 'available') AS available_count,
             COUNT(bc.id) FILTER (WHERE bc.status = 'on_loan') AS on_loan_count
      FROM books b
      LEFT JOIN categories c ON c.id = b.category_id
      LEFT JOIN book_copies bc ON bc.book_id = b.id AND bc.deleted_at IS NULL
      WHERE b.tenant_id = ? AND b.deleted_at IS NULL
      GROUP BY b.id, c.name
      ORDER BY b.title ASC
      `,
      [tenantId]
    )
    return result.rows as Record<string, unknown>[]
  }

  private async collectionByType(tenantId: string) {
    const result = await db.rawQuery(
      `
      SELECT COALESCE(material_type, 'unspecified') AS material_type,
             COUNT(*)::int AS title_count
      FROM books
      WHERE tenant_id = ? AND deleted_at IS NULL
      GROUP BY COALESCE(material_type, 'unspecified')
      ORDER BY title_count DESC, material_type ASC
      `,
      [tenantId]
    )
    return result.rows as Record<string, unknown>[]
  }

  private async collectionBySubject(tenantId: string) {
    const result = await db.rawQuery(
      `
      SELECT COALESCE(s.name, '(unassigned)') AS subject,
             COUNT(DISTINCT b.id)::int AS title_count
      FROM books b
      LEFT JOIN book_subjects bs ON bs.book_id = b.id
      LEFT JOIN subjects s ON s.id = bs.subject_id
      WHERE b.tenant_id = ? AND b.deleted_at IS NULL
      GROUP BY COALESCE(s.name, '(unassigned)')
      ORDER BY title_count DESC, subject ASC
      `,
      [tenantId]
    )
    return result.rows as Record<string, unknown>[]
  }

  private async copyStatusReport(tenantId: string) {
    const result = await db.rawQuery(
      `
      SELECT status, COUNT(*)::int AS copy_count
      FROM book_copies
      WHERE tenant_id = ? AND deleted_at IS NULL
      GROUP BY status
      ORDER BY copy_count DESC, status ASC
      `,
      [tenantId]
    )
    return result.rows as Record<string, unknown>[]
  }

  private async borrowedReport(tenantId: string, from: DateTime | null, to: DateTime | null) {
    const params: unknown[] = [tenantId]
    let dateFilter = ''
    if (from) {
      params.push(from.toSQL())
      dateFilter += ` AND br.borrowed_at >= ?`
    }
    if (to) {
      params.push(to.toSQL())
      dateFilter += ` AND br.borrowed_at <= ?`
    }

    const result = await db.rawQuery(
      `
      SELECT br.transaction_number, m.full_name AS patron, m.library_card_number,
             b.title AS book_title, bc.barcode AS copy_barcode,
             br.status, br.borrowed_at, br.due_at, br.returned_at
      FROM borrowings br
      JOIN members m ON m.id = br.member_id
      JOIN books b ON b.id = br.book_id
      LEFT JOIN book_copies bc ON bc.id = br.copy_id
      WHERE br.tenant_id = ? AND br.status IN ('borrowed','overdue','returned','lost')
      ${dateFilter}
      ORDER BY br.borrowed_at DESC NULLS LAST
      `,
      params
    )
    return result.rows as Record<string, unknown>[]
  }

  private async overdueReport(tenantId: string) {
    const result = await db.rawQuery(
      `
      SELECT br.transaction_number, m.full_name AS patron, m.library_card_number,
             b.title AS book_title, br.due_at,
             EXTRACT(DAY FROM (NOW() - br.due_at))::int AS days_overdue
      FROM borrowings br
      JOIN members m ON m.id = br.member_id
      JOIN books b ON b.id = br.book_id
      WHERE br.tenant_id = ? AND br.status = 'overdue'
      ORDER BY br.due_at ASC
      `,
      [tenantId]
    )
    return result.rows as Record<string, unknown>[]
  }

  private async mostBorrowedReport(tenantId: string, from: DateTime | null, to: DateTime | null) {
    const params: unknown[] = [tenantId]
    let dateFilter = ''
    if (from) {
      params.push(from.toSQL())
      dateFilter += ` AND br.borrowed_at >= ?`
    }
    if (to) {
      params.push(to.toSQL())
      dateFilter += ` AND br.borrowed_at <= ?`
    }

    const result = await db.rawQuery(
      `
      SELECT b.title, b.author_names AS authors, b.material_type,
             COUNT(br.id)::int AS loan_count,
             COUNT(br.id) FILTER (WHERE br.status IN ('borrowed','overdue'))::int AS active_loans
      FROM borrowings br
      JOIN books b ON b.id = br.book_id
      WHERE br.tenant_id = ?
        AND b.deleted_at IS NULL
        AND br.status IN ('borrowed','returned','overdue','lost')
        ${dateFilter}
      GROUP BY b.id, b.title, b.author_names, b.material_type
      ORDER BY loan_count DESC, b.title ASC
      `,
      params
    )
    return result.rows as Record<string, unknown>[]
  }

  private async bookLedger(tenantId: string, from: DateTime | null, to: DateTime | null) {
    const params: unknown[] = [tenantId]
    let dateFilter = ''
    if (from) {
      params.push(from.toSQL())
      dateFilter += ` AND br.created_at >= ?`
    }
    if (to) {
      params.push(to.toSQL())
      dateFilter += ` AND br.created_at <= ?`
    }

    const result = await db.rawQuery(
      `
      SELECT b.title, b.isbn13, br.transaction_number, br.status,
             m.full_name AS patron, br.borrowed_at, br.due_at, br.returned_at, br.renewal_count
      FROM borrowings br
      JOIN books b ON b.id = br.book_id
      JOIN members m ON m.id = br.member_id
      WHERE br.tenant_id = ?
      ${dateFilter}
      ORDER BY b.title ASC, br.created_at DESC
      `,
      params
    )
    return result.rows as Record<string, unknown>[]
  }

  private async patronLedger(tenantId: string, from: DateTime | null, to: DateTime | null) {
    const params: unknown[] = [tenantId]
    let dateFilter = ''
    if (from) {
      params.push(from.toSQL())
      dateFilter += ` AND (br.id IS NULL OR br.created_at >= ?)`
    }
    if (to) {
      params.push(to.toSQL())
      dateFilter += ` AND (br.id IS NULL OR br.created_at <= ?)`
    }

    const result = await db.rawQuery(
      `
      SELECT m.full_name AS patron, m.library_card_number, m.member_type, m.membership_status,
             br.transaction_number, b.title AS book_title, br.status,
             br.borrowed_at, br.due_at, br.returned_at
      FROM members m
      LEFT JOIN borrowings br ON br.member_id = m.id
      LEFT JOIN books b ON b.id = br.book_id
      WHERE m.tenant_id = ? AND m.deleted_at IS NULL
      ${dateFilter}
      ORDER BY m.full_name ASC, br.created_at DESC NULLS LAST
      `,
      params
    )
    return result.rows as Record<string, unknown>[]
  }

  private async chargesReport(tenantId: string, from: DateTime | null, to: DateTime | null) {
    const params: unknown[] = [tenantId]
    let dateFilter = ''
    if (from) {
      params.push(from.toSQL())
      dateFilter += ` AND f.assessed_at >= ?`
    }
    if (to) {
      params.push(to.toSQL())
      dateFilter += ` AND f.assessed_at <= ?`
    }

    const result = await db.rawQuery(
      `
      SELECT m.full_name AS patron, m.library_card_number, f.reason, f.status,
             f.amount_cents, f.paid_cents, f.waived_cents,
             (f.amount_cents - f.paid_cents - f.waived_cents) AS balance_cents,
             f.assessed_at, f.notes
      FROM fines f
      JOIN members m ON m.id = f.member_id
      WHERE f.tenant_id = ?
      ${dateFilter}
      ORDER BY f.assessed_at DESC
      `,
      params
    )

    return (result.rows as Record<string, unknown>[]).map((row) => ({
      patron: row.patron,
      library_card_number: row.library_card_number,
      reason: row.reason,
      status: row.status,
      currency: 'PHP',
      amount: formatMoneyFromCents(Number(row.amount_cents ?? 0)),
      paid: formatMoneyFromCents(Number(row.paid_cents ?? 0)),
      waived: formatMoneyFromCents(Number(row.waived_cents ?? 0)),
      balance: formatMoneyFromCents(Number(row.balance_cents ?? 0)),
      assessed_at: row.assessed_at,
      notes: row.notes,
    }))
  }

  private async acquisitionsReport(
    tenantId: string,
    from: DateTime | null,
    to: DateTime | null,
    status?: string
  ) {
    const params: unknown[] = [tenantId]
    let filter = ''
    if (from) {
      params.push(from.toSQL())
      filter += ` AND ar.created_at >= ?`
    }
    if (to) {
      params.push(to.toSQL())
      filter += ` AND ar.created_at <= ?`
    }
    if (status) {
      params.push(status)
      filter += ` AND ar.status = ?`
    }

    const result = await db.rawQuery(
      `
      SELECT ar.request_number, ar.status, ar.title, ar.authors, ar.isbn_13 AS isbn13,
             ar.material_type, ar.quantity, ar.requesting_unit, ar.ufms_pr_ref,
             ar.submitted_at, ar.routed_at, ar.cataloged_at, ar.created_at
      FROM acquisition_requests ar
      WHERE ar.tenant_id = ?
      ${filter}
      ORDER BY ar.created_at DESC
      `,
      params
    )
    return result.rows as Record<string, unknown>[]
  }

  private async searchTermsReport(tenantId: string, from: DateTime | null, to: DateTime | null) {
    const params: unknown[] = [tenantId]
    let filter = ''
    if (from) {
      params.push(from.toSQL())
      filter += ` AND searched_at >= ?`
    }
    if (to) {
      params.push(to.toSQL())
      filter += ` AND searched_at <= ?`
    }

    const result = await db.rawQuery(
      `
      SELECT query, COUNT(*)::int AS search_count,
             MAX(searched_at) AS last_searched_at
      FROM recent_searches
      WHERE tenant_id = ? AND TRIM(query) <> ''
      ${filter}
      GROUP BY query
      ORDER BY search_count DESC, query ASC
      LIMIT 500
      `,
      params
    )
    return result.rows as Record<string, unknown>[]
  }

  private async digitalUsageReport(tenantId: string) {
    const result = await db.rawQuery(
      `
      SELECT title, resource_type AS item_type, access_level, download_count, view_count, created_at
      FROM digital_repository_items
      WHERE tenant_id = ?
      ORDER BY download_count DESC, title ASC
      `,
      [tenantId]
    )
    return result.rows as Record<string, unknown>[]
  }

  private async userActivityReport(tenantId: string, from: DateTime | null, to: DateTime | null) {
    const params: unknown[] = [tenantId]
    let filter = ''
    if (from) {
      params.push(from.toSQL())
      filter += ` AND occurred_at >= ?`
    }
    if (to) {
      params.push(to.toSQL())
      filter += ` AND occurred_at <= ?`
    }

    const result = await db.rawQuery(
      `
      SELECT to_char(date_trunc('day', occurred_at), 'YYYY-MM-DD') AS activity_date,
             COUNT(*)::int AS event_count
      FROM attendance_events
      WHERE tenant_id = ?
      ${filter}
      GROUP BY date_trunc('day', occurred_at)
      ORDER BY date_trunc('day', occurred_at) DESC
      `,
      params
    )
    return result.rows as Record<string, unknown>[]
  }
}
