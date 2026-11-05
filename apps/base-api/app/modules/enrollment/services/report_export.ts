function escapeCsv(value: unknown): string {
  const s = value == null ? '' : String(value)
  return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s
}

export function rowsToCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return ''
  const keys = Object.keys(rows[0])
  return [keys.join(','), ...rows.map((r) => keys.map((k) => escapeCsv(r[k])).join(','))].join('\n')
}

export function rowsToExcelXml(rows: Record<string, unknown>[], sheetName = 'Report'): string {
  const keys = rows.length ? Object.keys(rows[0]) : ['empty']
  const header = keys.map((k) => `<Cell><Data ss:Type="String">${escapeXml(k)}</Data></Cell>`).join('')
  const body = rows
    .map((row) => {
      const cells = keys
        .map((k) => {
          const v = row[k]
          const isNum = typeof v === 'number' && Number.isFinite(v)
          return `<Cell><Data ss:Type="${isNum ? 'Number' : 'String'}">${escapeXml(v)}</Data></Cell>`
        })
        .join('')
      return `<Row>${cells}</Row>`
    })
    .join('')
  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Worksheet ss:Name="${escapeXml(sheetName)}">
  <Table>
   <Row>${header}</Row>
   ${body}
  </Table>
 </Worksheet>
</Workbook>`
}

function escapeXml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function rowsToSimplePdf(title: string, rows: Record<string, unknown>[]): Buffer {
  const keys = rows.length ? Object.keys(rows[0]) : []
  const lines = [
    title,
    `Generated ${new Date().toISOString()}`,
    '',
    keys.join(' | '),
    ...rows.slice(0, 200).map((r) => keys.map((k) => String(r[k] ?? '')).join(' | ')),
    rows.length > 200 ? `… ${rows.length - 200} more rows` : '',
  ].filter((l) => l !== undefined)

  const contentLines = lines.map((line, i) => {
    const y = 800 - i * 14
    const safe = String(line).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
    return `BT /F1 9 Tf 40 ${y} Td (${safe.slice(0, 110)}) Tj ET`
  })

  const stream = contentLines.join('\n')
  const objects: string[] = []
  objects.push('1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj')
  objects.push('2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj')
  objects.push(
    '3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>endobj'
  )
  objects.push(`4 0 obj<< /Length ${Buffer.byteLength(stream, 'utf8')} >>stream\n${stream}\nendstream endobj`)
  objects.push('5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj')

  let pdf = '%PDF-1.4\n'
  const offsets: number[] = [0]
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, 'utf8'))
    pdf += `${obj}\n`
  }
  const xrefStart = Buffer.byteLength(pdf, 'utf8')
  pdf += `xref\n0 ${objects.length + 1}\n`
  pdf += '0000000000 65535 f \n'
  for (let i = 1; i < offsets.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`
  }
  pdf += `trailer<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`
  return Buffer.from(pdf, 'utf8')
}
