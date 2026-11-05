import type { AnalyticsDashboard } from '@/types/analytics'

type MetricCard = {
  label: string
  value: string
  sub: string
  /** Soft fill RGB 0–1 */
  fill: [number, number, number]
}

function escapePdfText(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
}

function pdfBytesLength(value: string) {
  return new TextEncoder().encode(value).length
}

function formatDate(value: string | Date) {
  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatDateTime(value: Date) {
  return value.toLocaleString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/** Helvetica Type1 only supports WinAnsi; strip/replace unsupported glyphs. */
function toPdfSafeText(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u2010-\u2015]/g, '-') // hyphens/dashes
    .replace(/[\u2018\u2019\u201A]/g, "'")
    .replace(/[\u201C\u201D\u201E]/g, '"')
    .replace(/[\u2022\u00B7\u2026]/g, (ch) => (ch === '\u2026' ? '...' : '|'))
    .replace(/[^\x20-\x7E]/g, '')
}

function fillRect(x: number, y: number, w: number, h: number, rgb: [number, number, number]) {
  return `${rgb[0]} ${rgb[1]} ${rgb[2]} rg ${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f\n`
}

function strokeRect(
  x: number,
  y: number,
  w: number,
  h: number,
  rgb: [number, number, number],
  width = 1
) {
  return `${width} w ${rgb[0]} ${rgb[1]} ${rgb[2]} RG ${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re S\n`
}

function drawText(
  x: number,
  y: number,
  size: number,
  text: string,
  opts: { font?: '/F1' | '/F2'; color?: [number, number, number] } = {}
) {
  const font = opts.font ?? '/F1'
  const color = opts.color ?? [0.07, 0.07, 0.16]
  const [r, g, b] = color
  return `BT ${r} ${g} ${b} rg ${font} ${size} Tf ${x.toFixed(2)} ${y.toFixed(2)} Td (${escapePdfText(toPdfSafeText(text))}) Tj ET\n`
}

function assemblePdf(contentStream: string) {
  const objects = [
    '1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n',
    '2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj\n',
    '3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources<< /Font<< /F1 5 0 R /F2 6 0 R >> >> >>endobj\n',
    `4 0 obj<< /Length ${pdfBytesLength(contentStream)} >>stream\n${contentStream}\nendstream\nendobj\n`,
    '5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj\n',
    '6 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>endobj\n',
  ]

  let pdf = '%PDF-1.4\n'
  const offsets = [0]
  for (const obj of objects) {
    offsets.push(pdfBytesLength(pdf))
    pdf += obj
  }
  const xrefPos = pdfBytesLength(pdf)
  pdf += `xref\n0 ${objects.length + 1}\n`
  pdf += '0000000000 65535 f \n'
  for (let i = 1; i <= objects.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`
  }
  pdf += `trailer<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`
  return pdf
}

/**
 * Designed single-page dashboard summary PDF (no external PDF libs).
 * Letter size, ULMIS soft-tech styling.
 */
export function buildDashboardSummaryPdf(input: {
  tenantName: string
  generatedBy?: string
  data: AnalyticsDashboard
}) {
  const { tenantName, generatedBy, data } = input
  const o = data.overview
  const availability =
    o.totalCopies > 0 ? Math.round((o.availableCopies / o.totalCopies) * 100) : 0

  const primary: [number, number, number] = [0.388, 0.357, 1]
  const primaryDark: [number, number, number] = [0.184, 0.165, 0.42]
  const soft: [number, number, number] = [0.953, 0.953, 1]
  const ink: [number, number, number] = [0.07, 0.07, 0.16]
  const muted: [number, number, number] = [0.45, 0.47, 0.58]
  const white: [number, number, number] = [1, 1, 1]
  const border: [number, number, number] = [0.86, 0.87, 0.93]

  const cards: MetricCard[] = [
    {
      label: 'Books',
      value: String(o.totalBooks),
      sub: `${o.totalCopies} copies`,
      fill: [0.953, 0.91, 0.933],
    },
    {
      label: 'Members',
      value: String(o.activeMembers),
      sub: 'Active patrons',
      fill: [0.894, 0.941, 0.933],
    },
    {
      label: 'Active loans',
      value: String(o.activeLoans),
      sub: `${o.availableCopies} available`,
      fill: [0.957, 0.922, 0.878],
    },
    {
      label: 'Overdue',
      value: String(o.overdue),
      sub: 'Needs follow-up',
      fill: [0.949, 0.894, 0.894],
    },
    {
      label: 'Reservations',
      value: String(o.activeReservations),
      sub: 'Pending or ready',
      fill: soft,
    },
    {
      label: 'Checkouts',
      value: String(o.checkoutsThisMonth),
      sub: 'This month',
      fill: soft,
    },
    {
      label: 'Returns',
      value: String(o.returnsThisMonth),
      sub: 'This month',
      fill: soft,
    },
    {
      label: 'Attendance',
      value: String(o.attendanceToday ?? 0),
      sub: 'Today',
      fill: soft,
    },
    {
      label: 'On shelf',
      value: `${availability}%`,
      sub: 'Availability rate',
      fill: [0.898, 0.941, 0.906],
    },
  ]

  let stream = ''

  // Canvas background
  stream += fillRect(0, 0, 612, 792, [0.965, 0.969, 0.992])

  // Header band
  stream += fillRect(0, 732, 612, 60, primary)
  stream += drawText(40, 762, 11, 'ULMIS', {
    font: '/F2',
    color: white,
  })
  stream += drawText(40, 744, 18, 'Dashboard Summary', {
    font: '/F2',
    color: white,
  })
  stream += drawText(420, 754, 9, formatDateTime(new Date()), {
    color: [0.9, 0.9, 1],
  })

  // Institution meta card
  stream += fillRect(40, 668, 532, 48, white)
  stream += strokeRect(40, 668, 532, 48, border, 0.8)
  stream += drawText(52, 698, 11, tenantName || 'University Library', {
    font: '/F2',
    color: ink,
  })
  stream += drawText(
    52,
    682,
    9,
    `Period: last ${data.period.days} days | ${formatDate(data.period.from)} - ${formatDate(data.period.to)}`,
    { color: muted }
  )
  if (generatedBy) {
    stream += drawText(360, 682, 9, `Prepared by ${generatedBy}`, { color: muted })
  }

  // Section label
  stream += drawText(40, 648, 10, 'LIBRARY OVERVIEW', {
    font: '/F2',
    color: primaryDark,
  })

  // Metric cards 3×3
  const cardW = 168
  const cardH = 72
  const gapX = 14
  const gapY = 12
  const startX = 40
  const startY = 560

  cards.forEach((card, index) => {
    const col = index % 3
    const row = Math.floor(index / 3)
    const x = startX + col * (cardW + gapX)
    const y = startY - row * (cardH + gapY)

    stream += fillRect(x, y, cardW, cardH, card.fill)
    stream += strokeRect(x, y, cardW, cardH, border, 0.6)
    stream += fillRect(x, y + cardH - 3, cardW, 3, primary)
    stream += drawText(x + 14, y + 48, 9, card.label.toUpperCase(), {
      font: '/F2',
      color: muted,
    })
    stream += drawText(x + 14, y + 26, 20, card.value, {
      font: '/F2',
      color: ink,
    })
    stream += drawText(x + 14, y + 12, 8, card.sub, { color: muted })
  })

  // Top books panel — keep section title above the table box
  const cardsBottomY = startY - 2 * (cardH + gapY)
  const sectionTitleY = cardsBottomY - 36
  stream += drawText(40, sectionTitleY, 10, 'TOP BORROWED TITLES', {
    font: '/F2',
    color: primaryDark,
  })

  const topBooks = data.topBooks?.slice(0, 5) ?? []
  const rowH = 24
  const headerH = 28
  const panelPad = 12
  const listH =
    topBooks.length === 0
      ? 40
      : headerH + topBooks.length * rowH + panelPad
  const panelTop = sectionTitleY - 20
  const panelBottom = panelTop - listH

  stream += fillRect(40, panelBottom, 532, listH, white)
  stream += strokeRect(40, panelBottom, 532, listH, border, 0.8)

  if (topBooks.length === 0) {
    stream += drawText(52, panelTop - 22, 9, 'No borrowing activity in this period.', {
      color: muted,
    })
  } else {
    const headerY = panelTop - 18
    stream += drawText(52, headerY, 8, 'TITLE', { font: '/F2', color: muted })
    stream += drawText(420, headerY, 8, 'LOANS', { font: '/F2', color: muted })
    stream += drawText(490, headerY, 8, 'ACTIVE', { font: '/F2', color: muted })

    const firstRowY = headerY - 22
    topBooks.forEach((book, i) => {
      const y = firstRowY - i * rowH
      if (i % 2 === 0) {
        stream += fillRect(46, y - 6, 520, 20, soft)
      }
      const title = (book.title || 'Untitled').slice(0, 48)
      stream += drawText(52, y, 9, `${i + 1}. ${title}`, { color: ink })
      stream += drawText(430, y, 9, String(book.loanCount), { font: '/F2', color: primaryDark })
      stream += drawText(500, y, 9, String(book.activeLoans), { color: muted })
    })
  }

  // Footer
  stream += fillRect(0, 0, 612, 36, primaryDark)
  stream += drawText(40, 14, 8, 'University Library Management Information System', {
    color: [0.82, 0.82, 0.95],
  })
  stream += drawText(460, 14, 8, 'Confidential | Staff use', {
    color: [0.82, 0.82, 0.95],
  })

  return assemblePdf(stream)
}
