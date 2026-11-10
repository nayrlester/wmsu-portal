import { PDFDocument, StandardFonts, type PDFFont } from 'pdf-lib'

const PAGE_WIDTH = 612
const PAGE_HEIGHT = 792
const MARGIN = 50
const FONT_SIZE = 11
const LINE_HEIGHT = FONT_SIZE * 1.4

function wrapLine(text: string, font: PDFFont, maxWidth: number): string[] {
  if (!text.trim()) return ['']

  const words = text.split(/\s+/)
  const lines: string[] = []
  let current = ''

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    const width = font.widthOfTextAtSize(candidate, FONT_SIZE)
    if (width <= maxWidth) {
      current = candidate
      continue
    }

    if (current) lines.push(current)
    current = word
  }

  if (current) lines.push(current)
  return lines.length > 0 ? lines : ['']
}

export async function buildPdfFromPlainText(content: string): Promise<Buffer> {
  const pdf = await PDFDocument.create()
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const maxWidth = PAGE_WIDTH - MARGIN * 2

  let page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  let y = PAGE_HEIGHT - MARGIN

  for (const paragraph of content.split(/\r?\n/)) {
    const lines = wrapLine(paragraph, font, maxWidth)
    for (const line of lines) {
      if (y < MARGIN) {
        page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT])
        y = PAGE_HEIGHT - MARGIN
      }
      page.drawText(line, { x: MARGIN, y, size: FONT_SIZE, font })
      y -= LINE_HEIGHT
    }
  }

  userEditedEmptyPdfGuard(pdf, font, content)
  return Buffer.from(await pdf.save())
}

function userEditedEmptyPdfGuard(
  pdf: PDFDocument,
  font: PDFFont,
  content: string
): void {
  if (content.trim() || pdf.getPageCount() > 0) return
  const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  page.drawText(' ', { x: MARGIN, y: PAGE_HEIGHT - MARGIN, size: FONT_SIZE, font })
}
