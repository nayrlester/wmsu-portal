import type { AiAssistantResponse, AiContext } from '#modules/library/services/ai/ai_types'
import AiToolExecutor, { getAvailableTools, type AiToolCall } from '#modules/library/services/ai/ai_tools'

function extractBookQuery(message: string): string {
  const stripped = message
    .replace(/\?(.*)$/, '')
    .replace(/\b(do we have|is there|are there|any|available|availability|copies|copy|book|books|the|a|an)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  const numeric = message.match(/\b(\d{4})\b/)?.[1]
  if (numeric) return numeric

  return extractQuery(stripped || message, 'book')
}

function extractQuery(message: string, fallback = ''): string {
  const cleaned = message
    .replace(/^(search|find|look up|check|where is|locate|recommend|show me|list)\s+(for\s+)?/i, '')
    .replace(/\?$/, '')
    .trim()

  if (cleaned.length >= 2) return cleaned

  const quoted = message.match(/"([^"]+)"/)?.[1]
  if (quoted) return quoted

  return fallback || message.trim()
}

function pickTool(message: string, ctx: AiContext): AiToolCall | null {
  const lower = message.toLowerCase()
  const available = new Set(getAvailableTools(ctx).map((t) => t.name))

  if (/\b(rules?|policy|policies|how long|fine|borrow|loan period|penalty)\b/.test(lower)) {
    return available.has('explain_borrowing_rules') ? { name: 'explain_borrowing_rules', arguments: {} } : null
  }

  if (/\b(overdue|late return|past due)\b/.test(lower)) {
    return available.has('get_overdue_summary') ? { name: 'get_overdue_summary', arguments: {} } : null
  }

  if (/\b(report|circulation|statistics|stats|summary)\b/.test(lower)) {
    return available.has('generate_circulation_report')
      ? { name: 'generate_circulation_report', arguments: {} }
      : null
  }

  if (/\b(shelf|location|where is|where are|find on shelf)\b/.test(lower)) {
    return available.has('get_shelf_location')
      ? { name: 'get_shelf_location', arguments: { query: extractBookQuery(message) } }
      : null
  }

  if (/\b(recommend|suggestion|suggest|popular|best)\b/.test(lower)) {
    const genreMatch = lower.match(/\b(fiction|science|history|biography|fantasy|mystery)\b/)
    return available.has('recommend_books')
      ? {
          name: 'recommend_books',
          arguments: { genre: genreMatch?.[1], limit: 5 },
        }
      : null
  }

  if (/\b(available|availability|in stock|copies left)\b/.test(lower)) {
    return available.has('check_availability')
      ? { name: 'check_availability', arguments: { query: extractBookQuery(message) } }
      : null
  }

  if (/\b(member|patron|student|card number)\b/.test(lower)) {
    return available.has('search_members')
      ? { name: 'search_members', arguments: { query: extractQuery(message), limit: 5 } }
      : null
  }

  if (/\b(book|catalog|isbn|author|title|search|find)\b/.test(lower) || lower.length > 2) {
    if (available.has('search_books')) {
      return { name: 'search_books', arguments: { query: extractBookQuery(message), limit: 5 } }
    }
  }

  return available.has('explain_borrowing_rules')
    ? { name: 'explain_borrowing_rules', arguments: {} }
    : null
}

function formatToolResult(tool: string, result: unknown): string {
  switch (tool) {
    case 'search_books': {
      const items = result as Array<{ title: string; subtitle?: string; availableCopies: number }>
      if (!items.length) return 'No books matched your search.'
      return (
        'Here is what I found in the catalog:\n\n' +
        items
          .map(
            (b, i) =>
              `${i + 1}. **${b.title}**${b.subtitle ? ` — ${b.subtitle}` : ''} (${b.availableCopies} available)`
          )
          .join('\n')
      )
    }
    case 'check_availability': {
      const items = result as Array<{ title: string; available: boolean; availableCopies: number; totalCopies: number }>
      if (!items.length) return 'I could not find that book.'
      return items
        .map(
          (b) =>
            `**${b.title}**: ${b.available ? `${b.availableCopies} of ${b.totalCopies} copies available` : 'Currently unavailable'}`
        )
        .join('\n')
    }
    case 'recommend_books': {
      const items = result as Array<{ title: string; subtitle?: string; borrowCount?: number; reason?: string }>
      if (!items.length) return 'No recommendations available right now.'
      return (
        'Recommended titles:\n\n' +
        items
          .map((b, i) => {
            const reason = b.reason ?? (b.borrowCount ? `${b.borrowCount} loans` : 'Popular pick')
            return `${i + 1}. **${b.title}**${b.subtitle ? ` — ${b.subtitle}` : ''} (${reason})`
          })
          .join('\n')
      )
    }
    case 'explain_borrowing_rules': {
      const rules = result as { tenant: string; loanPeriodDays: number; finePerDay: string; maxFine: string; lostPenalty: string; summary: string }
      return (
        `**${rules.tenant} library rules**\n\n` +
        `- Loan period: **${rules.loanPeriodDays} days**\n` +
        `- Late fine: **${rules.finePerDay}/day** (max **${rules.maxFine}**)\n` +
        `- Lost book penalty: **${rules.lostPenalty}**\n\n` +
        rules.summary
      )
    }
    case 'get_overdue_summary': {
      const data = result as { overdueCount: number; items: Array<{ transactionNumber: string; memberName?: string; bookTitle?: string; dueAt?: string }> }
      if (data.overdueCount === 0) return 'Great news — there are no overdue borrowings right now.'
      const lines = data.items
        .map((i) => `- **${i.bookTitle ?? 'Book'}** (${i.transactionNumber}) — ${i.memberName ?? 'Member'}, due ${i.dueAt ? new Date(i.dueAt).toLocaleDateString() : 'unknown'}`)
        .join('\n')
      return `**${data.overdueCount} overdue item(s)**\n\n${lines}`
    }
    case 'generate_circulation_report': {
      const r = result as Record<string, unknown>
      return (
        `**Circulation report** (${r.period})\n\n` +
        `- Active loans: **${r.activeLoans}**\n` +
        `- Overdue: **${r.overdueCount}**\n` +
        `- Pending requests: **${r.pendingRequests}**\n` +
        `- Outstanding fines: **${r.finesOutstanding}**\n\n` +
        `${r.note}`
      )
    }
    case 'search_members': {
      const items = result as Array<{ name: string; cardNumber?: string; memberType?: string; status?: string }>
      if (!items.length) return 'No members matched your search.'
      return items
        .map((m, i) => `${i + 1}. **${m.name}** — card ${m.cardNumber ?? 'N/A'}, ${m.memberType ?? 'member'} (${m.status})`)
        .join('\n')
    }
    case 'get_shelf_location': {
      const items = result as Array<{ title: string; locations: Array<{ shelf: string; barcode: string }> }>
      if (!items.length) return 'I could not find shelf locations for that title.'
      return items
        .map((book) => {
          const locs = book.locations.length
            ? book.locations.map((l) => `  - Shelf **${l.shelf}** (barcode ${l.barcode})`).join('\n')
            : '  - No available copies with shelf assignments'
          return `**${book.title}**\n${locs}`
        })
        .join('\n\n')
    }
    default:
      return JSON.stringify(result, null, 2)
  }
}

export default class LocalAgentProvider {
  async chat(ctx: AiContext, userMessage: string): Promise<AiAssistantResponse> {
    const toolCall = pickTool(userMessage, ctx)

    if (!toolCall) {
      return {
        content:
          'I can help with book search, availability, recommendations, library rules, overdue items, reports, and shelf locations. What would you like to know?',
        toolsUsed: [],
        provider: 'local',
      }
    }

    const executor = new AiToolExecutor()
    const result = await executor.execute(toolCall, ctx)

    return {
      content: formatToolResult(toolCall.name, result),
      toolsUsed: [toolCall.name],
      provider: 'local',
    }
  }
}
