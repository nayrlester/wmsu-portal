import JSZip from 'jszip'
import mammoth from 'mammoth'
import { PDFParse } from 'pdf-parse'
import * as XLSX from 'xlsx'
import { AllowedMimeType, isAllowedMimeType } from '#modules/documents/domain/files/file_constants'

const MAX_EXTRACTED_CHARS = 500_000

function normalizeText(text: string): string {
  return text.replace(/\0/g, ' ').replace(/\s+/g, ' ').trim().slice(0, MAX_EXTRACTED_CHARS)
}

function extractTextFromOfficeXml(xml: string): string {
  const chunks: string[] = []
  const patterns = [/<(?:w:t|a:t|text:span)[^>]*>([^<]*)<\/(?:w:t|a:t|text:span)>/g, /<t[^>]*>([^<]*)<\/t>/g]

  for (const pattern of patterns) {
    for (const match of xml.matchAll(pattern)) {
      const value = match[1]?.trim()
      if (value) chunks.push(value)
    }
  }

  return chunks.join(' ')
}

export class FileTextExtractor {
  async extract(buffer: Buffer, mimeType: string, fileName: string): Promise<string> {
    if (!buffer?.length) return ''

    try {
      if (mimeType === 'application/pdf') {
        return normalizeText(await this.extractPdf(buffer))
      }

      if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        return normalizeText(await this.extractDocx(buffer))
      }

      if (mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
        return normalizeText(this.extractSpreadsheet(buffer))
      }

      if (mimeType === 'application/vnd.ms-excel') {
        return normalizeText(this.extractSpreadsheet(buffer))
      }

      if (mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') {
        return normalizeText(await this.extractPptx(buffer))
      }

      if (mimeType === 'text/plain' || mimeType === 'text/csv') {
        return normalizeText(buffer.toString('utf8'))
      }

      if (mimeType.startsWith('image/')) {
        return ''
      }

      if (!isAllowedMimeType(mimeType)) {
        const lower = fileName.toLowerCase()
        if (lower.endsWith('.pdf')) return normalizeText(await this.extractPdf(buffer))
        if (lower.endsWith('.docx')) return normalizeText(await this.extractDocx(buffer))
        if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
          return normalizeText(this.extractSpreadsheet(buffer))
        }
        if (lower.endsWith('.pptx')) return normalizeText(await this.extractPptx(buffer))
        if (lower.endsWith('.txt') || lower.endsWith('.csv')) {
          return normalizeText(buffer.toString('utf8'))
        }
      }
    } catch {
      return ''
    }

    return ''
  }

  private async extractPdf(buffer: Buffer): Promise<string> {
    const parser = new PDFParse({ data: buffer })
    try {
      const result = await parser.getText()
      return result.text ?? ''
    } finally {
      try {
        await parser.destroy()
      } catch {
        // Ignore cleanup failures from pdf-parse.
      }
    }
  }

  private async extractDocx(buffer: Buffer): Promise<string> {
    const result = await mammoth.extractRawText({ buffer })
    return result.value ?? ''
  }

  private extractSpreadsheet(buffer: Buffer): string {
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    const chunks: string[] = []

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName]
      if (!sheet) continue
      const sheetText = XLSX.utils.sheet_to_csv(sheet, { blankrows: false })
      if (sheetText.trim()) {
        chunks.push(sheetText)
      }
    }

    return chunks.join('\n')
  }

  private async extractPptx(buffer: Buffer): Promise<string> {
    const zip = await JSZip.loadAsync(buffer)
    const slideNames = Object.keys(zip.files)
      .filter((name) => /^ppt\/slides\/slide\d+\.xml$/i.test(name))
      .sort()

    const slideTexts = await Promise.all(
      slideNames.map(async (name) => {
        const xml = await zip.files[name].async('text')
        return extractTextFromOfficeXml(xml)
      })
    )

    return slideTexts.filter(Boolean).join('\n')
  }
}

export const fileTextExtractor = new FileTextExtractor()

export type { AllowedMimeType }
