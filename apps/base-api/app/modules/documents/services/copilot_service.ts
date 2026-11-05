import { randomUUID } from 'node:crypto'
import {
  CopilotActionType,
  CopilotIntent,
  type CopilotCard,
  type CopilotChatResponse,
  type CopilotMessage,
  type CopilotPageContext,
  type CopilotSessionRef,
  type CopilotUserContext,
} from '#modules/documents/domain/copilot/copilot_types'
import { DocumentStatus } from '#modules/documents/domain/enums/index'
import { copilotIntentService } from '#modules/documents/services/copilot_intent_service'
import { copilotActionService } from '#modules/documents/services/copilot_action_service'
import { documentService } from '#modules/documents/services/document_service'
import { searchService } from '#modules/documents/services/search_service'
import { workflowEngineService } from '#modules/documents/services/workflow_engine_service'
import { approvalService } from '#modules/documents/services/approval_service'
import { documentRepository } from '#infrastructure/repositories/document_repository'
import User from '#modules/documents/models/user'

const WELCOME_SUGGESTIONS = [
  'Find a document',
  'Create a document',
  'Show pending approvals',
  'Generate report',
  'Explain workflow',
  'Search audit logs',
]

const NAV_ROUTES: Record<string, { href: string; label: string }> = {
  dashboard: { href: '/app/dashboard', label: 'Dashboard' },
  documents: { href: '/app/documents', label: 'Documents' },
  'create-document': { href: '/app/documents/create', label: 'Create Document' },
  approvals: { href: '/app/approvals', label: 'Approvals' },
  workflows: { href: '/app/workflows', label: 'Workflows' },
  reports: { href: '/app/reports', label: 'Reports' },
  'audit-logs': { href: '/app/audit-logs', label: 'Audit Logs' },
  team: { href: '/app/team', label: 'Team' },
  settings: { href: '/app/settings', label: 'Settings' },
  notifications: { href: '/app/notifications', label: 'Notifications' },
}

export class CopilotService {
  async chat(input: {
    message: string
    user: User
    tenantId: string
    pageContext?: CopilotPageContext
    history?: CopilotMessage[]
    sessionRefs?: CopilotSessionRef[]
    ipAddress?: string | null
    userAgent?: string | null
  }): Promise<CopilotChatResponse> {
    const userContext = await copilotActionService.buildUserContext(input.user, input.tenantId)
    const detected = copilotIntentService.detect(
      input.message,
      input.pageContext,
      input.sessionRefs,
      input.history
    )

    switch (detected.intent) {
      case CopilotIntent.GREETING:
      case CopilotIntent.HELP:
        return this.greetingResponse(userContext.fullName)

      case CopilotIntent.KNOWLEDGE_QUERY:
        return this.handleKnowledgeQuery(input.message, detected.entities, userContext)

      case CopilotIntent.SEARCH:
        return this.handleSearch(detected.entities.searchQuery ?? input.message, userContext)

      case CopilotIntent.NAVIGATE:
        return this.handleNavigate(detected.entities.navigationTarget ?? 'dashboard', userContext)

      case CopilotIntent.CREATE_DOCUMENT:
        return this.handleCreateDocument(detected.entities, userContext, input.message, detected.intent)

      case CopilotIntent.APPROVE_DOCUMENT:
        return this.handleApprovalIntent('approve', detected.entities, userContext, input.message, detected.intent)

      case CopilotIntent.REJECT_DOCUMENT:
        return this.handleApprovalIntent('reject', detected.entities, userContext, input.message, detected.intent)

      case CopilotIntent.RETURN_DOCUMENT:
        return this.handleApprovalIntent('return', detected.entities, userContext, input.message, detected.intent)

      case CopilotIntent.SUMMARIZE_DOCUMENT:
        return this.handleSummarize(detected.entities, userContext, input.pageContext, input.message, detected.intent)

      case CopilotIntent.EXPLAIN_WORKFLOW:
        return this.handleExplainWorkflow(detected.entities, userContext, input.pageContext, input.user)

      case CopilotIntent.GENERATE_REPORT:
        return this.handleGenerateReport(userContext)

      case CopilotIntent.OPEN_REFERENCE:
        return this.handleOpenReference(detected.entities, userContext)

      default:
        return this.handleSearch(input.message, userContext)
    }
  }

  private greetingResponse(fullName: string): CopilotChatResponse {
    const firstName = fullName.split(' ')[0] ?? fullName
    return {
      messageId: randomUUID(),
      intent: CopilotIntent.GREETING,
      content: `Hey ${firstName} — what can I help you with? I can look up documents, start a request, pull numbers, or tell you where something is in the approval chain.`,
      suggestions: WELCOME_SUGGESTIONS,
    }
  }

  private async handleKnowledgeQuery(
    message: string,
    entities: Record<string, string>,
    userContext: CopilotUserContext
  ): Promise<CopilotChatResponse> {
    const lower = message.toLowerCase()

    if (!copilotActionService.hasPermission(userContext, 'documents.view')) {
      return this.deniedResponse('view document statistics')
    }

    const stats = await documentService.getDashboardStats()

    if (lower.includes('pending approval') || lower.includes('my pending')) {
      const pending = await documentRepository.paginate({
        status: DocumentStatus.PENDING_APPROVAL,
        limit: 5,
        page: 1,
      })

      const cards = pending.all().map((doc) => copilotActionService.documentCard(doc))
      const count = pending.total

      return {
        messageId: randomUUID(),
        intent: CopilotIntent.KNOWLEDGE_QUERY,
        content:
          count === 0
            ? "You're all caught up — nothing waiting on your approval right now."
            : count === 1
              ? "You've got 1 document waiting on approval:"
              : `You've got ${count} documents waiting on approval. Here are the latest:`,
        cards,
        sessionRefs: this.buildSessionRefs(cards),
        suggestions: ['Approve the first one', 'Show overdue documents', 'Generate report'],
      }
    }

    if (lower.includes('overdue')) {
      const count = stats.overdueDocuments
      return {
        messageId: randomUUID(),
        intent: CopilotIntent.KNOWLEDGE_QUERY,
        content:
          count === 0
            ? "Good news — nothing's overdue at the moment."
            : count === 1
              ? "There's 1 document past its deadline. Might be worth checking on."
              : `There are ${count} documents past their deadline. Might be worth a look.`,
        cards: [this.analyticsCard('Overdue Documents', stats.overdueDocuments, 'Needs attention')],
        suggestions: ['Find overdue documents', 'Show pending approvals'],
      }
    }

    return {
      messageId: randomUUID(),
      intent: CopilotIntent.KNOWLEDGE_QUERY,
      content: "Here's a quick snapshot of what's going on:",
      cards: [
        this.analyticsCard('Total Documents', stats.totalDocuments),
        this.analyticsCard('Pending', stats.pendingDocuments),
        this.analyticsCard('Approved', stats.approvedDocuments),
        this.analyticsCard('Rejected', stats.rejectedDocuments),
        this.analyticsCard('Overdue', stats.overdueDocuments, 'SLA attention'),
      ],
      suggestions: ['Show pending approvals', 'Find procurement requests', 'Generate report'],
    }
  }

  private async handleSearch(query: string, userContext: CopilotUserContext): Promise<CopilotChatResponse> {
    if (!copilotActionService.hasPermission(userContext, 'documents.view')) {
      return this.deniedResponse('search documents')
    }

    const term = query.replace(/^(find|search|show|list)\s+/i, '').trim()
    if (term.length < 2) {
      return {
        messageId: randomUUID(),
        intent: CopilotIntent.SEARCH,
        content: 'Give me at least a couple of characters to search on.',
        suggestions: WELCOME_SUGGESTIONS,
      }
    }

    const permissions = {
      canViewDocuments: true,
      canViewUsers: copilotActionService.hasPermission(userContext, 'users.manage'),
      canViewWorkflows: copilotActionService.hasPermission(userContext, 'workflows.manage'),
    }

    const results = await searchService.search({ q: term, limit: 8 }, permissions)
    const cards: CopilotCard[] = [
      ...results.documents.map((doc) => ({
        id: doc.id,
        type: 'search_result' as const,
        title: doc.title,
        subtitle: doc.trackingNumber,
        description: doc.snippet ?? doc.status,
        href: `/app/documents/${doc.id}`,
        metadata: { entityType: 'document', status: doc.status },
      })),
      ...results.files.map((file) => ({
        id: file.id,
        type: 'search_result' as const,
        title: file.originalName,
        subtitle: file.trackingNumber,
        description: file.snippet ?? file.mimeType,
        href: `/app/documents/${file.documentId}?fileId=${file.id}`,
        metadata: { entityType: 'file' },
      })),
      ...results.workflows.map((wf) => ({
        id: wf.id,
        type: 'search_result' as const,
        title: wf.name,
        subtitle: wf.status,
        description: wf.description ?? undefined,
        href: '/app/workflows',
        metadata: { entityType: 'workflow' },
      })),
    ]

    if (lowerIncludesAudit(term) && copilotActionService.hasPermission(userContext, 'audit.view')) {
      cards.push({
        id: 'audit-logs',
        type: 'navigation',
        title: 'Audit Logs',
        subtitle: 'System activity',
        description: `Search audit logs for "${term}"`,
        href: '/app/audit-logs',
      })
    }

    const total = results.meta.total

    return {
      messageId: randomUUID(),
      intent: CopilotIntent.SEARCH,
      content:
        total > 0
          ? total === 1
            ? `Found 1 match for "${term}":`
            : `Found ${total} matches for "${term}":`
          : `Nothing came up for "${term}". Try a tracking number or a different keyword?`,
      cards: cards.slice(0, 8),
      sessionRefs: this.buildSessionRefs(cards),
      suggestions: total > 0 ? ['Open the first one', 'Create a document'] : ['Show pending approvals'],
    }
  }

  private handleNavigate(target: string, userContext: CopilotUserContext): CopilotChatResponse {
    const route = NAV_ROUTES[target] ?? NAV_ROUTES.dashboard!
    const permission = this.navigationPermission(target)

    if (permission && !copilotActionService.hasPermission(userContext, permission)) {
      return this.deniedResponse(`open ${route.label}`)
    }

    return {
      messageId: randomUUID(),
      intent: CopilotIntent.NAVIGATE,
      content: `Sure — taking you to ${route.label}.`,
      cards: [
        {
          id: route.href,
          type: 'navigation',
          title: route.label,
          href: route.href,
        },
      ],
    }
  }

  private async handleCreateDocument(
    entities: Record<string, string>,
    userContext: CopilotUserContext,
    prompt: string,
    intent: CopilotIntent
  ): Promise<CopilotChatResponse> {
    if (!copilotActionService.hasPermission(userContext, 'documents.create')) {
      return this.deniedResponse('create documents')
    }

    const title = entities.documentTitle?.trim() || 'New Document Request'

    const pendingAction = copilotActionService.createPendingAction({
      userContext,
      prompt,
      intent,
      action: {
        type: CopilotActionType.CREATE_DOCUMENT,
        label: 'Create Document',
        description: `Set up a draft called "${title}"?`,
        confirmLabel: 'Yes, create it',
        cancelLabel: 'Never mind',
        payload: { title },
        requiredPermission: 'documents.create',
      },
    })

    return {
      messageId: randomUUID(),
      intent: CopilotIntent.CREATE_DOCUMENT,
      content: `I can set up a draft called "${title}". Want me to go ahead?`,
      pendingAction,
      suggestions: ['Create procurement request', 'Cancel'],
    }
  }

  private async handleApprovalIntent(
    kind: 'approve' | 'reject' | 'return',
    entities: Record<string, string>,
    userContext: CopilotUserContext,
    prompt: string,
    intent: CopilotIntent
  ): Promise<CopilotChatResponse> {
    if (!copilotActionService.hasPermission(userContext, 'documents.approve')) {
      return this.deniedResponse(`${kind} documents`)
    }

    try {
      const document = await copilotActionService.resolveDocumentRef(entities)
      const actionType =
        kind === 'approve'
          ? CopilotActionType.APPROVE
          : kind === 'reject'
            ? CopilotActionType.REJECT
            : CopilotActionType.RETURN

      const pendingAction = copilotActionService.createPendingAction({
        userContext,
        prompt,
        intent,
        action: {
          type: actionType,
          label: `${kind.charAt(0).toUpperCase()}${kind.slice(1)} document`,
          description: `${kind.charAt(0).toUpperCase()}${kind.slice(1)} ${document.trackingNumber} — "${document.title}"?`,
          confirmLabel: `Yes, ${kind} it`,
          cancelLabel: 'Never mind',
          payload: { documentId: document.id, trackingNumber: document.trackingNumber },
          requiredPermission: 'documents.approve',
        },
      })

      const kindPhrase =
        kind === 'approve' ? 'approve' : kind === 'reject' ? 'reject' : 'send back'

      return {
        messageId: randomUUID(),
        intent,
        content: `That's ${document.trackingNumber} — "${document.title}". Should I ${kindPhrase} it?`,
        cards: [copilotActionService.documentCard(document)],
        pendingAction,
      }
    } catch {
      return {
        messageId: randomUUID(),
        intent,
        content: "Hmm, I can't find that document. Double-check the tracking number — something like DTS-2026-000123.",
        suggestions: ['Find a document', 'Show pending approvals'],
      }
    }
  }

  private async handleSummarize(
    entities: Record<string, string>,
    userContext: CopilotUserContext,
    pageContext: CopilotPageContext | undefined,
    prompt: string,
    intent: CopilotIntent
  ): Promise<CopilotChatResponse> {
    if (!copilotActionService.hasPermission(userContext, 'documents.view')) {
      return this.deniedResponse('summarize documents')
    }

    try {
      const document = await copilotActionService.resolveDocumentRef({
        ...entities,
        documentId: entities.documentId ?? pageContext?.documentId,
        trackingNumber: entities.trackingNumber ?? pageContext?.trackingNumber,
      })

      if (document.aiSummary) {
        return {
          messageId: randomUUID(),
          intent: CopilotIntent.SUMMARIZE_DOCUMENT,
          content: `Here's the gist of ${document.trackingNumber}:\n\n${document.aiSummary}`,
          cards: [copilotActionService.documentCard(document)],
          suggestions: ['Explain workflow', 'Who needs to approve next?'],
        }
      }

      const latestFile = document.files?.find((f) => !f.deletedAt)
      if (!latestFile) {
        return {
          messageId: randomUUID(),
          intent: CopilotIntent.SUMMARIZE_DOCUMENT,
          content: `${document.trackingNumber} doesn't have any files attached yet. Upload one and I can summarize it for you.`,
          cards: [copilotActionService.documentCard(document)],
        }
      }

      if (!copilotActionService.hasPermission(userContext, 'documents.update')) {
        return {
          messageId: randomUUID(),
          intent: CopilotIntent.SUMMARIZE_DOCUMENT,
          content: `There's no summary on ${document.trackingNumber} yet, and your account can't generate one. Someone with edit access would need to kick that off.`,
          cards: [copilotActionService.documentCard(document)],
        }
      }

      const pendingAction = copilotActionService.createPendingAction({
        userContext,
        prompt,
        intent,
        action: {
          type: CopilotActionType.TRIGGER_INTELLIGENCE,
          label: 'Summarize document',
          description: `Read through ${document.trackingNumber} and write up a summary?`,
          confirmLabel: 'Yes, summarize it',
          cancelLabel: 'Not now',
          payload: { documentId: document.id, fileId: latestFile.id },
          requiredPermission: 'documents.update',
        },
      })

      return {
        messageId: randomUUID(),
        intent: CopilotIntent.SUMMARIZE_DOCUMENT,
        content: `No summary on file for ${document.trackingNumber} yet. Want me to read through it and put one together?`,
        pendingAction,
        cards: [copilotActionService.documentCard(document)],
      }
    } catch {
      return {
        messageId: randomUUID(),
        intent: CopilotIntent.SUMMARIZE_DOCUMENT,
        content: pageContext?.documentId
          ? "I couldn't pull together a summary for this one."
          : 'Open a document first, or give me a tracking number to summarize.',
        suggestions: ['Find a document'],
      }
    }
  }

  private async handleExplainWorkflow(
    entities: Record<string, string>,
    userContext: CopilotUserContext,
    pageContext: CopilotPageContext | undefined,
    user: User
  ): Promise<CopilotChatResponse> {
    if (!copilotActionService.hasPermission(userContext, 'documents.view')) {
      return this.deniedResponse('view workflow status')
    }

    try {
      const document = await copilotActionService.resolveDocumentRef({
        ...entities,
        documentId: entities.documentId ?? pageContext?.documentId,
        trackingNumber: entities.trackingNumber ?? pageContext?.trackingNumber,
      })

      const [workflowState, activityResult] = await Promise.all([
        workflowEngineService.getDocumentWorkflowState(document.id, user),
        approvalService.getActivityFeed(document.id, 5),
      ])

      const activeSteps = workflowState.instance?.steps ?? []
      const workflowStatus = workflowState.instance?.status ?? (workflowState.active ? 'active' : 'none')
      const statusLabel = document.status.replace(/_/g, ' ')

      let statusLine: string
      if (activeSteps.length > 0) {
        const stepNames = activeSteps.map((s) => s.name).join(', ')
        statusLine = `It's ${statusLabel} right now, waiting on ${stepNames}.`
      } else if (workflowStatus === 'completed') {
        statusLine = `It's ${statusLabel} — the workflow's finished.`
      } else {
        statusLine = `It's ${statusLabel}, but there's nothing actively waiting for approval at the moment.`
      }

      const activityCards: CopilotCard[] = activityResult.activity.slice(0, 3).map((entry, idx) => ({
        id: `activity-${idx}`,
        type: 'activity' as const,
        title: entry.action.replace(/_/g, ' '),
        subtitle: entry.fromUser?.fullName ?? entry.toUser?.fullName ?? undefined,
        description: entry.remarks ?? entry.occurredAt,
      }))

      return {
        messageId: randomUUID(),
        intent: CopilotIntent.EXPLAIN_WORKFLOW,
        content: `For ${document.trackingNumber}: ${statusLine}`,
        cards: [
          copilotActionService.documentCard(document),
          {
            id: 'workflow-state',
            type: 'workflow',
            title: 'Workflow Status',
            subtitle: workflowStatus,
            description: activeSteps.map((s) => s.name).join(' → ') || 'No active steps',
            metadata: { activeSteps },
          },
          ...activityCards,
        ],
        suggestions: ['Summarize this document', 'Show workflow history'],
      }
    } catch {
      return {
        messageId: randomUUID(),
        intent: CopilotIntent.EXPLAIN_WORKFLOW,
        content: "Open a document first, or send me a tracking number — then I can walk you through where it is.",
        suggestions: ['Find a document', 'Show pending approvals'],
      }
    }
  }

  private async handleGenerateReport(userContext: CopilotUserContext): Promise<CopilotChatResponse> {
    if (!copilotActionService.hasPermission(userContext, 'reports.view')) {
      return this.deniedResponse('view reports')
    }

    const stats = await documentService.getDashboardStats()
    const approvalRate =
      stats.totalDocuments > 0
        ? Math.round((stats.approvedDocuments / stats.totalDocuments) * 100)
        : 0

    return {
      messageId: randomUUID(),
      intent: CopilotIntent.GENERATE_REPORT,
      content: "Here's a quick read on how approvals are tracking this month:",
      cards: [
        this.analyticsCard('Total Documents', stats.totalDocuments),
        this.analyticsCard('Approved', stats.approvedDocuments),
        this.analyticsCard('Pending', stats.pendingDocuments),
        this.analyticsCard('Approval Rate', approvalRate, '% of total'),
        this.analyticsCard('Overdue', stats.overdueDocuments, 'SLA compliance risk'),
        {
          id: 'full-report',
          type: 'navigation',
          title: 'Full Reports',
          subtitle: 'Detailed analytics',
          href: '/app/reports',
        },
      ],
      suggestions: ['Which department has the most delays?', 'Show pending approvals'],
    }
  }

  private async handleOpenReference(
    entities: Record<string, string>,
    userContext: CopilotUserContext
  ): Promise<CopilotChatResponse> {
    if (entities.refType === 'document' && entities.refId) {
      const document = await documentRepository.findByIdOrFail(entities.refId)
      return {
        messageId: randomUUID(),
        intent: CopilotIntent.OPEN_REFERENCE,
        content: `Got it — opening ${document.trackingNumber}.`,
        cards: [copilotActionService.documentCard(document)],
      }
    }

    return {
      messageId: randomUUID(),
      intent: CopilotIntent.OPEN_REFERENCE,
      content: "Not sure which one you mean — try searching again?",
    }
  }

  private analyticsCard(title: string, value: number, suffix?: string): CopilotCard {
    return {
      id: `metric-${title.toLowerCase().replace(/\s+/g, '-')}`,
      type: 'analytics',
      title,
      subtitle: suffix && suffix !== '% of total' ? suffix : undefined,
      description: suffix === '% of total' ? `${value}% of total` : String(value),
      metadata: { value },
    }
  }

  private buildSessionRefs(cards: CopilotCard[]): CopilotSessionRef[] {
    return cards
      .filter((c) => c.type === 'search_result' || c.type === 'document')
      .map((card, index) => ({
        index: index + 1,
        type: (card.metadata?.entityType as CopilotSessionRef['type']) ?? 'document',
        id: card.id,
        label: card.subtitle ?? card.title,
        href: card.href,
      }))
  }

  private navigationPermission(target: string): string | null {
    const map: Record<string, string> = {
      documents: 'documents.view',
      'create-document': 'documents.create',
      approvals: 'documents.approve',
      workflows: 'workflows.manage',
      reports: 'reports.view',
      'audit-logs': 'audit.view',
      team: 'users.manage',
      settings: 'settings.manage',
    }
    return map[target] ?? null
  }

  private deniedResponse(action: string): CopilotChatResponse {
    return {
      messageId: randomUUID(),
      intent: CopilotIntent.UNKNOWN,
      content: `Looks like your account can't ${action}. Your admin can grant access if you need it.`,
      suggestions: ['Find a document', 'Show dashboard metrics'],
    }
  }
}

function lowerIncludesAudit(term: string): boolean {
  return term.toLowerCase().includes('audit')
}

export const copilotService = new CopilotService()
