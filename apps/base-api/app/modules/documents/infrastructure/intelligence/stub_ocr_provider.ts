import type { OcrExtractInput, OcrProvider } from '#modules/documents/domain/intelligence/ocr_provider'
import { SupportedDocumentCategory } from '#modules/documents/domain/intelligence/intelligence_types'
import { fileTextExtractor } from '#infrastructure/files/file_text_extractor'

const SAMPLE_TEXT: Record<string, string> = {
  invoice: [
    'INVOICE',
    'Invoice Number: INV-2026-0042',
    'Vendor: ABC Supplies Inc.',
    'Amount Due: PHP 15,250.00',
    'Due Date: 2026-07-15',
  ].join('\n'),
  contract: [
    'SERVICE AGREEMENT',
    'This Contract is entered between Demo Municipality and Vendor Corp.',
    'Effective Date: 2026-01-01',
    'Expiry Date: 2027-01-01',
  ].join('\n'),
  permit: [
    'BUSINESS PERMIT APPLICATION',
    'Issuing Authority: Demo Municipality',
    'Applicant: Juan Dela Cruz',
    'Permit Type: Business Operation',
    'Expiry Date: 2026-12-31',
  ].join('\n'),
  purchase_request: [
    'PURCHASE REQUEST',
    'PR Number: PR-2026-0018',
    'Department: Administration',
    'Items: Office supplies and printer toner',
    'Estimated Total: PHP 8,500.00',
  ].join('\n'),
  default: 'Document text extracted for processing.',
}

export class StubOcrProvider implements OcrProvider {
  readonly name = 'stub'

  isConfigured(): boolean {
    return true
  }

  async extractText(input: OcrExtractInput) {
    if (input.fileBuffer?.length) {
      const extracted = await fileTextExtractor.extract(
        input.fileBuffer,
        input.mimeType,
        input.key
      )

      if (extracted.trim().length > 0) {
        return {
          text: extracted,
          provider: this.name,
          confidence: 95,
        }
      }
    }

    const hint = this.detectCategoryHint(input.key, input.fileBuffer)
    const text = SAMPLE_TEXT[hint] ?? SAMPLE_TEXT.default

    return {
      text,
      provider: this.name,
      confidence: 92,
    }
  }

  private detectCategoryHint(key: string, buffer?: Buffer): string {
    const source = `${key} ${buffer?.toString('utf8', 0, 200) ?? ''}`.toLowerCase()

    if (source.includes('invoice')) return SupportedDocumentCategory.INVOICE
    if (source.includes('contract') || source.includes('agreement')) {
      return SupportedDocumentCategory.CONTRACT
    }
    if (source.includes('permit')) return SupportedDocumentCategory.PERMIT
    if (source.includes('purchase') || source.includes('pr-')) {
      return SupportedDocumentCategory.PURCHASE_REQUEST
    }

    return 'default'
  }
}

export const stubOcrProvider = new StubOcrProvider()
