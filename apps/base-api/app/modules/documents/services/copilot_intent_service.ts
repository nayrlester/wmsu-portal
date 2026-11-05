import {
  CopilotIntent,
  type CopilotMessage,
  type CopilotPageContext,
  type CopilotSessionRef,
} from '#modules/documents/domain/copilot/copilot_types'

export interface DetectedIntent {
  intent: CopilotIntent
  confidence: number
  entities: Record<string, string>
}

const TRACKING_PATTERN = /\b(DTS-\d{4}-\d{6,})\b/i
const ORDINAL_PATTERN = /\b(?:open|show|select|view|the)\s+(?:the\s+)?(\d+(?:st|nd|rd|th)?|first|second|third|fourth|fifth|last)\b/i

const ORDINAL_MAP: Record<string, number> = {
  first: 1,
  second: 2,
  third: 3,
  fourth: 4,
  fifth: 5,
  last: -1,
  '1st': 1,
  '2nd': 2,
  '3rd': 3,
  '4th': 4,
  '5th': 5,
}

export class CopilotIntentService {
  detect(
    message: string,
    pageContext?: CopilotPageContext,
    sessionRefs?: CopilotSessionRef[],
    history?: CopilotMessage[]
  ): DetectedIntent {
    const text = message.trim()
    const lower = text.toLowerCase()
    const entities: Record<string, string> = {}

    const trackingMatch = text.match(TRACKING_PATTERN)
    if (trackingMatch) {
      entities.trackingNumber = trackingMatch[1]!.toUpperCase()
    }

    if (pageContext?.documentId && !entities.documentId) {
      entities.documentId = pageContext.documentId
    }
    if (pageContext?.trackingNumber && !entities.trackingNumber) {
      entities.trackingNumber = pageContext.trackingNumber
    }

    const ordinalMatch = lower.match(ORDINAL_PATTERN)
    if (ordinalMatch && sessionRefs?.length) {
      const token = ordinalMatch[1]!
      const index =
        ORDINAL_MAP[token] ??
        (token.endsWith('st') || token.endsWith('nd') || token.endsWith('rd') || token.endsWith('th')
          ? parseInt(token, 10)
          : parseInt(token, 10))

      if (!Number.isNaN(index)) {
        const resolved =
          index === -1 ? sessionRefs[sessionRefs.length - 1] : sessionRefs[index - 1]
        if (resolved) {
          entities.refIndex = String(index)
          entities.refId = resolved.id
          entities.refType = resolved.type
          return { intent: CopilotIntent.OPEN_REFERENCE, confidence: 0.95, entities }
        }
      }
    }

    if (this.matchesAny(lower, ['hello', 'hi ', 'hey', 'good morning', 'good afternoon'])) {
      return { intent: CopilotIntent.GREETING, confidence: 0.9, entities }
    }

    if (this.matchesAny(lower, ['help', 'what can you do', 'capabilities'])) {
      return { intent: CopilotIntent.HELP, confidence: 0.9, entities }
    }

    if (
      this.matchesAny(lower, [
        'approve',
        'sign off',
        'accept document',
      ]) &&
      (entities.trackingNumber || entities.documentId || lower.includes('document'))
    ) {
      return { intent: CopilotIntent.APPROVE_DOCUMENT, confidence: 0.88, entities }
    }

    if (this.matchesAny(lower, ['reject', 'deny']) && (entities.trackingNumber || entities.documentId)) {
      return { intent: CopilotIntent.REJECT_DOCUMENT, confidence: 0.88, entities }
    }

    if (this.matchesAny(lower, ['return document', 'send back', 'return for revision'])) {
      return { intent: CopilotIntent.RETURN_DOCUMENT, confidence: 0.85, entities }
    }

    if (
      this.matchesAny(lower, [
        'create',
        'new document',
        'new request',
        'start a',
        'draft a',
      ])
    ) {
      if (this.extractAfter(lower, ['create', 'new', 'start a', 'draft a'])) {
        entities.documentTitle = this.extractAfter(lower, [
          'create a new',
          'create new',
          'create a',
          'create',
          'new',
          'start a',
          'draft a',
        ])
      }
      return { intent: CopilotIntent.CREATE_DOCUMENT, confidence: 0.85, entities }
    }

    if (
      this.matchesAny(lower, [
        'summarize',
        'summary',
        'executive summary',
        'what is this document about',
        'explain this document',
      ])
    ) {
      return { intent: CopilotIntent.SUMMARIZE_DOCUMENT, confidence: 0.9, entities }
    }

    if (
      this.matchesAny(lower, [
        'workflow',
        'who needs to approve',
        'who approves next',
        'where is this document',
        'workflow history',
        'workflow status',
        'why is this delayed',
        'current stage',
        'approval chain',
      ])
    ) {
      return { intent: CopilotIntent.EXPLAIN_WORKFLOW, confidence: 0.88, entities }
    }

    if (
      this.matchesAny(lower, [
        'report',
        'statistics',
        'stats',
        'analytics',
        'performance',
        'monthly',
        'department performance',
        'sla',
        'overdue',
        'how many',
        'approved today',
        'pending approval',
      ])
    ) {
      if (this.matchesAny(lower, ['report', 'generate report', 'monthly report'])) {
        return { intent: CopilotIntent.GENERATE_REPORT, confidence: 0.85, entities }
      }
      return { intent: CopilotIntent.KNOWLEDGE_QUERY, confidence: 0.82, entities }
    }

    if (
      this.matchesAny(lower, [
        'find',
        'search',
        'look for',
        'show me',
        'list',
        'contract',
        'procurement',
        'audit log',
      ]) &&
      !this.matchesAny(lower, ['pending approval', 'report', 'workflow'])
    ) {
      entities.searchQuery = this.extractSearchQuery(text)
      return { intent: CopilotIntent.SEARCH, confidence: 0.8, entities }
    }

    if (
      this.matchesAny(lower, [
        'go to',
        'navigate',
        'open dashboard',
        'open approvals',
        'open settings',
        'open team',
        'open workflows',
        'open reports',
        'open audit',
        'open notifications',
      ])
    ) {
      entities.navigationTarget = this.resolveNavigationTarget(lower)
      return { intent: CopilotIntent.NAVIGATE, confidence: 0.85, entities }
    }

    if (
      this.matchesAny(lower, ['assign', 'route to', 'forward to']) &&
      (entities.trackingNumber || entities.documentId)
    ) {
      entities.assignTarget = this.extractAssignTarget(text)
      return { intent: CopilotIntent.UPDATE_DOCUMENT, confidence: 0.8, entities }
    }

    if (history?.length && lower.length < 40) {
      const lastAssistant = [...history].reverse().find((m) => m.role === 'assistant')
      if (lastAssistant?.content.includes('?')) {
        return { intent: CopilotIntent.KNOWLEDGE_QUERY, confidence: 0.5, entities }
      }
    }

    if (text.length >= 3) {
      entities.searchQuery = text
      return { intent: CopilotIntent.SEARCH, confidence: 0.55, entities }
    }

    return { intent: CopilotIntent.UNKNOWN, confidence: 0.3, entities }
  }

  private matchesAny(text: string, phrases: string[]): boolean {
    return phrases.some((phrase) => text.includes(phrase))
  }

  private extractAfter(text: string, prefixes: string[]): string {
    const lower = text.toLowerCase()
    for (const prefix of prefixes.sort((a, b) => b.length - a.length)) {
      const idx = lower.indexOf(prefix)
      if (idx >= 0) {
        const remainder = text.slice(idx + prefix.length).trim()
        const cleaned = remainder.replace(/^(document|request|procurement request)\s+/i, '').trim()
        if (cleaned.length >= 2) return cleaned.replace(/[?.!]+$/, '')
      }
    }
    return ''
  }

  private extractSearchQuery(text: string): string {
    const patterns = [
      /(?:find|search for|look for|show me|list)\s+(?:all\s+)?(.+)/i,
      /(?:find|search)\s+(.+)/i,
    ]
    for (const pattern of patterns) {
      const match = text.match(pattern)
      if (match?.[1]) return match[1].replace(/[?.!]+$/, '').trim()
    }
    return text.replace(/[?.!]+$/, '').trim()
  }

  private resolveNavigationTarget(lower: string): string {
    if (lower.includes('dashboard') || lower.includes('home')) return 'dashboard'
    if (lower.includes('approval')) return 'approvals'
    if (lower.includes('create')) return 'create-document'
    if (lower.includes('workflow')) return 'workflows'
    if (lower.includes('report')) return 'reports'
    if (lower.includes('audit')) return 'audit-logs'
    if (lower.includes('team') || lower.includes('user')) return 'team'
    if (lower.includes('setting')) return 'settings'
    if (lower.includes('notification')) return 'notifications'
    if (lower.includes('document')) return 'documents'
    return 'dashboard'
  }

  private extractAssignTarget(text: string): string {
    const match = text.match(/(?:assign|route|forward)\s+(?:document\s+\S+\s+)?(?:to\s+)?(.+)/i)
    return match?.[1]?.replace(/[?.!]+$/, '').trim() ?? ''
  }
}

export const copilotIntentService = new CopilotIntentService()
