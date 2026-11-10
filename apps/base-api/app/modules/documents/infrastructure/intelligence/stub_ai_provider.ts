import type { AiAnalysisInput, AiProvider } from '#modules/documents/domain/intelligence/ai_provider'
import {
  SupportedDocumentCategory,
  type AiAnalysisContext,
  type ClassificationResult,
  type MetadataExtractionResult,
  type RoutingSuggestionResult,
  type SummaryResult,
} from '#modules/documents/domain/intelligence/intelligence_types'

const CATEGORY_KEYWORDS: Record<SupportedDocumentCategory, string[]> = {
  [SupportedDocumentCategory.INVOICE]: ['invoice', 'amount due', 'vendor', 'bill'],
  [SupportedDocumentCategory.CONTRACT]: ['contract', 'agreement', 'party', 'effective date'],
  [SupportedDocumentCategory.PERMIT]: ['permit', 'application', 'issuing authority', 'business permit'],
  [SupportedDocumentCategory.PURCHASE_REQUEST]: ['purchase request', 'pr number', 'requisition'],
  [SupportedDocumentCategory.UNKNOWN]: [],
}

export class StubAiProvider implements AiProvider {
  readonly name = 'stub'

  isConfigured(): boolean {
    return true
  }

  async classify(input: AiAnalysisInput): Promise<ClassificationResult> {
    const category = this.detectCategory(input)
    return {
      category,
      confidence: category === SupportedDocumentCategory.UNKNOWN ? 0.4 : 0.91,
      alternatives: this.buildAlternatives(category),
    }
  }

  async extractMetadata(
    input: AiAnalysisInput,
    category: SupportedDocumentCategory
  ): Promise<MetadataExtractionResult> {
    const text = `${input.fileName ?? ''}\n${input.text}`.toLowerCase()

    switch (category) {
      case SupportedDocumentCategory.INVOICE:
        return {
          category,
          fields: {
            invoiceNumber: this.match(/inv[-\s]?(\d+)/i, text) ?? 'INV-2026-0042',
            vendor: 'ABC Supplies Inc.',
            amount: 15250,
            currency: 'PHP',
            dueDate: '2026-07-15',
          },
        }
      case SupportedDocumentCategory.CONTRACT:
        return {
          category,
          fields: {
            contractType: 'Service Agreement',
            effectiveDate: '2026-01-01',
            expiryDate: '2027-01-01',
            parties: 'Demo Municipality; Vendor Corp.',
          },
        }
      case SupportedDocumentCategory.PERMIT:
        return {
          category,
          fields: {
            permitType: 'Business Operation',
            applicant: 'Juan Dela Cruz',
            issuingAuthority: 'Demo Municipality',
            expiryDate: '2026-12-31',
          },
        }
      case SupportedDocumentCategory.PURCHASE_REQUEST:
        return {
          category,
          fields: {
            prNumber: this.match(/pr[-\s]?(\d+)/i, text) ?? 'PR-2026-0018',
            department: 'Administration',
            totalAmount: 8500,
            currency: 'PHP',
          },
        }
      default:
        return { category, fields: {} }
    }
  }

  async suggestRouting(
    input: AiAnalysisInput,
    category: SupportedDocumentCategory,
    context: AiAnalysisContext
  ): Promise<RoutingSuggestionResult> {
    const departmentMap: Record<SupportedDocumentCategory, { code: string; role: string; reason: string }> = {
      [SupportedDocumentCategory.INVOICE]: {
        code: 'ADMIN',
        role: 'manager',
        reason: 'Invoices require finance review and approval.',
      },
      [SupportedDocumentCategory.CONTRACT]: {
        code: 'ADMIN',
        role: 'approver',
        reason: 'Contracts require legal and executive approval.',
      },
      [SupportedDocumentCategory.PERMIT]: {
        code: 'ADMIN',
        role: 'manager',
        reason: 'Permit applications are handled by administration.',
      },
      [SupportedDocumentCategory.PURCHASE_REQUEST]: {
        code: 'ADMIN',
        role: 'manager',
        reason: 'Purchase requests require departmental budget review.',
      },
      [SupportedDocumentCategory.UNKNOWN]: {
        code: 'ADMIN',
        role: 'staff',
        reason: 'Default routing to administration for manual triage.',
      },
    }

    const mapping = departmentMap[category]
    const department = context.departments.find((entry) => entry.code === mapping.code) ?? context.departments[0]

    return {
      suggestedDepartmentCode: department?.code ?? mapping.code,
      suggestedDepartmentName: department?.name ?? 'Administration',
      suggestedAssigneeRole: mapping.role,
      reason: mapping.reason,
      confidence: category === SupportedDocumentCategory.UNKNOWN ? 0.5 : 0.88,
    }
  }

  async summarize(
    input: AiAnalysisInput,
    category: SupportedDocumentCategory
  ): Promise<SummaryResult> {
    const labels: Record<SupportedDocumentCategory, string> = {
      [SupportedDocumentCategory.INVOICE]: 'invoice payment request',
      [SupportedDocumentCategory.CONTRACT]: 'contractual agreement',
      [SupportedDocumentCategory.PERMIT]: 'permit application',
      [SupportedDocumentCategory.PURCHASE_REQUEST]: 'purchase requisition',
      [SupportedDocumentCategory.UNKNOWN]: 'document',
    }

    const label = labels[category]
    const snippet = input.text.split('\n').filter(Boolean).slice(0, 2).join(' ')

    return {
      summary: `This ${label} was analyzed automatically. ${snippet}`.trim(),
      keyPoints: [
        `Document classified as ${category.replace(/_/g, ' ')}`,
        'Metadata fields extracted for routing',
        'No confidential attachments were exposed during analysis',
      ],
    }
  }

  private detectCategory(input: AiAnalysisInput): SupportedDocumentCategory {
    const haystack = `${input.fileName ?? ''} ${input.text}`.toLowerCase()
    let best = SupportedDocumentCategory.UNKNOWN
    let bestScore = 0

    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS) as Array<
      [SupportedDocumentCategory, string[]]
    >) {
      if (category === SupportedDocumentCategory.UNKNOWN) continue
      const score = keywords.filter((keyword) => haystack.includes(keyword)).length
      if (score > bestScore) {
        bestScore = score
        best = category
      }
    }

    return best
  }

  private buildAlternatives(category: SupportedDocumentCategory) {
    return Object.values(SupportedDocumentCategory)
      .filter((value) => value !== category && value !== SupportedDocumentCategory.UNKNOWN)
      .slice(0, 2)
      .map((value, index) => ({
        category: value,
        confidence: Math.max(0.1, 0.5 - index * 0.15),
      }))
  }

  private match(pattern: RegExp, text: string): string | null {
    const match = text.match(pattern)
    if (!match) return null
    return match[0].toUpperCase()
  }
}

export const stubAiProvider = new StubAiProvider()
