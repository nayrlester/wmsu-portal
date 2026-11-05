import { DateTime } from 'luxon'

type Rgb = [number, number, number]

const PAGE_W = 612
const PAGE_H = 792
const MARGIN_X = 36
const MARGIN_BOTTOM = 48
const CONTENT_W = PAGE_W - MARGIN_X * 2

const PRIMARY: Rgb = [0.388, 0.357, 1]
const PRIMARY_DARK: Rgb = [0.184, 0.165, 0.42]
const SOFT: Rgb = [0.953, 0.953, 1]
const INK: Rgb = [0.07, 0.07, 0.16]
const MUTED: Rgb = [0.45, 0.47, 0.58]
const WHITE: Rgb = [1, 1, 1]
const BORDER: Rgb = [0.86, 0.87, 0.93]
const PAGE_BG: Rgb = [0.965, 0.969, 0.992]
const HEADER_BG: Rgb = [0.93, 0.925, 1]

const COLUMN_LABELS: Record<string, string> = {
  title: 'Title',
  isbn13: 'ISBN-13',
  authors: 'Authors',
  category: 'Category',
  copy_count: 'Copies',
  available_count: 'Available',
  on_loan_count: 'Borrowed',
  transaction_number: 'Txn #',
  patron: 'Patron',
  library_card_number: 'Card #',
  book_title: 'Book',
  copy_barcode: 'Barcode',
  status: 'Status',
  borrowed_at: 'Borrowed',
  due_at: 'Due',
  returned_at: 'Returned',
  days_overdue: 'Days late',
  renewal_count: 'Renewals',
  member_type: 'Type',
  membership_status: 'Membership',
  reason: 'Reason',
  currency: 'Currency',
  amount: 'Amount',
  paid: 'Paid',
  waived: 'Waived',
  balance: 'Balance',
  assessed_at: 'Assessed',
  notes: 'Notes',
}

/** Prefer readable column order for known report shapes. */
const COLUMN_PRIORITY: string[] = [
  'title',
  'book_title',
  'patron',
  'transaction_number',
  'isbn13',
  'authors',
  'category',
  'library_card_number',
  'copy_barcode',
  'status',
  'copy_count',
  'available_count',
  'on_loan_count',
  'borrowed_at',
  'due_at',
  'returned_at',
  'days_overdue',
  'renewal_count',
  'member_type',
  'membership_status',
  'reason',
  'amount',
  'paid',
  'waived',
  'balance',
  'assessed_at',
  'notes',
  'currency',
]

function escapePdfText(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
}

function toPdfSafeText(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u2010-\u2015]/g, '-')
    .replace(/[\u2018\u2019\u201A]/g, "'")
    .replace(/[\u201C\u201D\u201E]/g, '"')
    .replace(/[\u2022\u00B7\u2026]/g, (ch) => (ch === '\u2026' ? '...' : '|'))
    .replace(/[^\x20-\x7E]/g, '')
}

function fillRect(x: number, y: number, w: number, h: number, rgb: Rgb) {
  return `${rgb[0]} ${rgb[1]} ${rgb[2]} rg ${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f\n`
}

function strokeRect(x: number, y: number, w: number, h: number, rgb: Rgb, width = 0.8) {
  return `${width} w ${rgb[0]} ${rgb[1]} ${rgb[2]} RG ${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re S\n`
}

function drawText(
  x: number,
  y: number,
  size: number,
  text: string,
  opts: { font?: '/F1' | '/F2'; color?: Rgb } = {}
) {
  const font = opts.font ?? '/F1'
  const color = opts.color ?? INK
  const [r, g, b] = color
  return `BT ${r} ${g} ${b} rg ${font} ${size} Tf ${x.toFixed(2)} ${y.toFixed(2)} Td (${escapePdfText(toPdfSafeText(text))}) Tj ET\n`
}

function humanizeKey(key: string) {
  if (COLUMN_LABELS[key]) return COLUMN_LABELS[key]
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatCell(key: string, value: unknown): string {
  if (value == null || value === '') return '-'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)

  const text = String(value)
  if (/(_at|At)$/.test(key) || /^\d{4}-\d{2}-\d{2}/.test(text)) {
    const dt = DateTime.fromISO(text, { setZone: true })
    if (dt.isValid) {
      if (text.includes('T')) return dt.toFormat('MMM d, yyyy HH:mm')
      return dt.toFormat('MMM d, yyyy')
    }
  }
  return text
}

function truncateToWidth(text: string, maxWidth: number, fontSize: number) {
  const avg = fontSize * 0.52
  const maxChars = Math.max(3, Math.floor(maxWidth / avg))
  if (text.length <= maxChars) return text
  return `${text.slice(0, Math.max(1, maxChars - 3))}...`
}

function pickColumns(keys: string[], maxColumns = 7) {
  const ranked = [...keys].sort((a, b) => {
    const ia = COLUMN_PRIORITY.indexOf(a)
    const ib = COLUMN_PRIORITY.indexOf(b)
    const sa = ia === -1 ? 999 : ia
    const sb = ib === -1 ? 999 : ib
    return sa - sb
  })
  return ranked.slice(0, maxColumns)
}

function columnWidths(columns: string[]) {
  const weights = columns.map((key) => {
    if (key === 'title' || key === 'book_title' || key === 'authors' || key === 'notes' || key === 'patron') {
      return 2.4
    }
    if (key === 'isbn13' || key === 'transaction_number' || key === 'library_card_number') return 1.4
    if (/_count$|_at$|status|category|reason|amount|paid|waived|balance/.test(key)) return 1
    return 1.1
  })
  const total = weights.reduce((sum, w) => sum + w, 0)
  return weights.map((w) => (w / total) * CONTENT_W)
}

function assembleMultiPagePdf(pageStreams: string[]) {
  const fontF1 = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'
  const fontF2 = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>'

  const pageCount = pageStreams.length
  const firstPageObj = 3
  const firstContentObj = firstPageObj + pageCount
  const font1Obj = firstContentObj + pageCount
  const font2Obj = font1Obj + 1

  const kids = pageStreams.map((_, i) => `${firstPageObj + i} 0 R`).join(' ')

  let pdf = '%PDF-1.4\n'
  const offsets = [0]

  const push = (obj: string) => {
    offsets.push(Buffer.byteLength(pdf, 'utf8'))
    pdf += obj
  }

  push('1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n')
  push(`2 0 obj<< /Type /Pages /Kids [${kids}] /Count ${pageCount} >>endobj\n`)

  for (let i = 0; i < pageCount; i++) {
    const contentRef = firstContentObj + i
    push(
      `${firstPageObj + i} 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Contents ${contentRef} 0 R /Resources<< /Font<< /F1 ${font1Obj} 0 R /F2 ${font2Obj} 0 R >> >> >>endobj\n`
    )
  }

  for (let i = 0; i < pageCount; i++) {
    const stream = pageStreams[i]
    const len = Buffer.byteLength(stream, 'utf8')
    push(`${firstContentObj + i} 0 obj<< /Length ${len} >>stream\n${stream}\nendstream\nendobj\n`)
  }

  push(`${font1Obj} 0 obj${fontF1}endobj\n`)
  push(`${font2Obj} 0 obj${fontF2}endobj\n`)

  const xrefPos = Buffer.byteLength(pdf, 'utf8')
  const size = offsets.length
  pdf += `xref\n0 ${size}\n`
  pdf += '0000000000 65535 f \n'
  for (let i = 1; i < size; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`
  }
  pdf += `trailer<< /Size ${size} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`
  return pdf
}

export type ReportPdfOptions = {
  title: string
  subtitle?: string
  generatedAt?: DateTime
  rows: Record<string, unknown>[]
  maxRows?: number
}

/**
 * Branded multi-page ULMIS operational report PDF (no external deps).
 */
export function buildReportPdf(options: ReportPdfOptions) {
  const {
    title,
    subtitle,
    generatedAt = DateTime.now(),
    rows,
    maxRows = 500,
  } = options

  const limited = rows.slice(0, maxRows)
  const allKeys = limited.length ? Object.keys(limited[0]) : []
  const columns = pickColumns(allKeys, 7)
  const widths = columnWidths(columns)
  const rowH = 18
  const headerRowH = 22
  const tableTopY = PAGE_H - 118
  const usableH = tableTopY - MARGIN_BOTTOM - 8
  const rowsPerPage = Math.max(1, Math.floor((usableH - headerRowH) / rowH))

  const pageChunks: Record<string, unknown>[][] = []
  if (limited.length === 0) {
    pageChunks.push([])
  } else {
    for (let i = 0; i < limited.length; i += rowsPerPage) {
      pageChunks.push(limited.slice(i, i + rowsPerPage))
    }
  }

  const generatedLabel = generatedAt.toFormat('MMM d, yyyy, h:mm a')
  const totalPages = pageChunks.length

  const pageStreams = pageChunks.map((chunk, pageIndex) => {
    let stream = ''
    stream += fillRect(0, 0, PAGE_W, PAGE_H, PAGE_BG)

    // Header band
    stream += fillRect(0, PAGE_H - 52, PAGE_W, 52, PRIMARY)
    stream += drawText(MARGIN_X, PAGE_H - 22, 10, 'ULMIS', { font: '/F2', color: WHITE })
    stream += drawText(MARGIN_X, PAGE_H - 40, 14, title, { font: '/F2', color: WHITE })
    stream += drawText(PAGE_W - 160, PAGE_H - 28, 8, generatedLabel, {
      color: [0.9, 0.9, 1],
    })

    // Meta strip
    stream += fillRect(MARGIN_X, PAGE_H - 100, CONTENT_W, 36, WHITE)
    stream += strokeRect(MARGIN_X, PAGE_H - 100, CONTENT_W, 36, BORDER)
    const metaLeft = subtitle || 'University Library operational report'
    stream += drawText(MARGIN_X + 12, PAGE_H - 78, 9, metaLeft, { color: MUTED })
    stream += drawText(
      MARGIN_X + 12,
      PAGE_H - 92,
      9,
      `${rows.length} row${rows.length === 1 ? '' : 's'}${rows.length > maxRows ? ` (showing first ${maxRows})` : ''}`,
      { font: '/F2', color: INK }
    )
    stream += drawText(PAGE_W - MARGIN_X - 90, PAGE_H - 85, 9, `Page ${pageIndex + 1} of ${totalPages}`, {
      color: MUTED,
    })

    // Table frame
    const tableBottom = MARGIN_BOTTOM + 8
    const tableH = tableTopY - tableBottom
    stream += fillRect(MARGIN_X, tableBottom, CONTENT_W, tableH, WHITE)
    stream += strokeRect(MARGIN_X, tableBottom, CONTENT_W, tableH, BORDER)

    // Column header
    const headerY = tableTopY - headerRowH
    stream += fillRect(MARGIN_X, headerY, CONTENT_W, headerRowH, HEADER_BG)
    let x = MARGIN_X
    columns.forEach((key, i) => {
      const w = widths[i]
      const label = truncateToWidth(humanizeKey(key).toUpperCase(), w - 8, 7)
      stream += drawText(x + 6, headerY + 7, 7, label, { font: '/F2', color: PRIMARY_DARK })
      x += w
    })

    if (chunk.length === 0) {
      stream += drawText(MARGIN_X + 12, headerY - 28, 10, 'No records for this report.', {
        color: MUTED,
      })
    } else {
      chunk.forEach((row, rowIndex) => {
        const y = headerY - (rowIndex + 1) * rowH
        if (rowIndex % 2 === 0) {
          stream += fillRect(MARGIN_X + 1, y, CONTENT_W - 2, rowH, SOFT)
        }
        let cellX = MARGIN_X
        columns.forEach((key, i) => {
          const w = widths[i]
          const raw = formatCell(key, row[key])
          const text = truncateToWidth(raw, w - 10, 8)
          stream += drawText(cellX + 6, y + 5, 8, text, { color: INK })
          cellX += w
        })
      })
    }

    // Footer
    stream += fillRect(0, 0, PAGE_W, 32, PRIMARY_DARK)
    stream += drawText(MARGIN_X, 12, 8, 'University Library Management Information System', {
      color: [0.82, 0.82, 0.95],
    })
    stream += drawText(PAGE_W - 150, 12, 8, 'Confidential | Staff use', {
      color: [0.82, 0.82, 0.95],
    })

    return stream
  })

  return assembleMultiPagePdf(pageStreams)
}
