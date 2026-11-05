import Book from '#modules/library/models/book'
import BookCopy from '#modules/library/models/book_copy'
import BorrowingService from '#modules/library/services/borrowing/borrowing_service'
import FineService from '#modules/library/services/fines/fine_service'
import SearchService from '#modules/library/services/search/search_service'
import { BORROWING_DEFAULTS } from '#modules/library/services/borrowing/borrowing_settings'
import { borrowingTenantId } from '#modules/library/services/borrowing/borrowing_helpers'
import type { AiContext } from '#modules/library/services/ai/ai_types'
import { formatMoneyFromCents } from '#modules/library/helpers/currency'

export interface AiToolDefinition {
  name: string
  permission?: string
  description: string
  parameters: Record<string, unknown>
}

export interface AiToolCall {
  name: string
  arguments: Record<string, unknown>
}

const TOOL_DEFINITIONS: AiToolDefinition[] = [
  {
    name: 'search_books',
    permission: 'books:read',
    description: 'Search the book catalog by title, author, ISBN, or keyword',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        limit: { type: 'number', description: 'Max results (default 5)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'check_availability',
    permission: 'books:read',
    description: 'Check how many copies of a book are available',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Book title or search term' },
      },
      required: ['query'],
    },
  },
  {
    name: 'recommend_books',
    permission: 'books:read',
    description: 'Recommend popular or available books',
    parameters: {
      type: 'object',
      properties: {
        genre: { type: 'string', description: 'Optional genre filter' },
        limit: { type: 'number', description: 'Max results (default 5)' },
      },
    },
  },
  {
    name: 'explain_borrowing_rules',
    description: 'Explain tenant borrowing rules and fine policy',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'get_overdue_summary',
    permission: 'borrowings:read',
    description: 'Summarize overdue borrowings',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'generate_circulation_report',
    permission: 'borrowings:read',
    description: 'Generate a circulation summary report',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'search_members',
    permission: 'members:read',
    description: 'Search library members by name or card number',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Member name or card number' },
        limit: { type: 'number', description: 'Max results (default 5)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_shelf_location',
    permission: 'books:read',
    description: 'Find shelf locations for book copies',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Book title or search term' },
      },
      required: ['query'],
    },
  },
]

export function getAvailableTools(ctx: AiContext): AiToolDefinition[] {
  return TOOL_DEFINITIONS.filter(
    (tool) => !tool.permission || ctx.permissions.includes(tool.permission)
  )
}

export default class AiToolExecutor {
  private searchService = new SearchService()
  private borrowingService = new BorrowingService()
  private fineService = new FineService()

  async execute(toolCall: AiToolCall, ctx: AiContext): Promise<unknown> {
    const tool = TOOL_DEFINITIONS.find((t) => t.name === toolCall.name)
    if (!tool) {
      throw new Error(`Unknown tool: ${toolCall.name}`)
    }
    if (tool.permission && !ctx.permissions.includes(tool.permission)) {
      throw new Error(`Permission denied for tool: ${toolCall.name}`)
    }

    switch (toolCall.name) {
      case 'search_books':
        return this.searchBooks(String(toolCall.arguments.query ?? ''), Number(toolCall.arguments.limit ?? 5))
      case 'check_availability':
        return this.checkAvailability(String(toolCall.arguments.query ?? ''))
      case 'recommend_books':
        return this.recommendBooks(
          toolCall.arguments.genre ? String(toolCall.arguments.genre) : undefined,
          Number(toolCall.arguments.limit ?? 5)
        )
      case 'explain_borrowing_rules':
        return this.explainRules(ctx)
      case 'get_overdue_summary':
        return this.overdueSummary()
      case 'generate_circulation_report':
        return this.circulationReport()
      case 'search_members':
        return this.searchMembers(String(toolCall.arguments.query ?? ''), Number(toolCall.arguments.limit ?? 5))
      case 'get_shelf_location':
        return this.shelfLocation(String(toolCall.arguments.query ?? ''))
      default:
        throw new Error(`Tool not implemented: ${toolCall.name}`)
    }
  }

  private async searchBooks(query: string, limit: number) {
    const result = await this.searchService.search({
      q: query,
      types: ['book'],
      perPage: Math.min(limit, 10),
    })

    return result.items.map((item) => ({
      title: item.label,
      subtitle: item.subtitle,
      availableCopies: item.metadata.availableCopies ?? 0,
      totalCopies: item.metadata.totalCopies ?? 0,
      url: item.url,
    }))
  }

  private async checkAvailability(query: string) {
    const result = await this.searchService.search({
      q: query,
      types: ['book'],
      perPage: 5,
    })

    return result.items.map((item) => ({
      title: item.label,
      available: Number(item.metadata.availableCopies ?? 0) > 0,
      availableCopies: item.metadata.availableCopies ?? 0,
      totalCopies: item.metadata.totalCopies ?? 0,
    }))
  }

  private async recommendBooks(genre: string | undefined, limit: number) {
    const result = await this.searchService.search({
      preset: 'most_borrowed',
      genre,
      perPage: Math.min(limit, 10),
    })

    if (result.items.length === 0) {
      const available = await this.searchService.search({
        preset: 'available',
        perPage: Math.min(limit, 10),
      })
      return available.items.map((item) => ({
        title: item.label,
        reason: 'Available now',
        borrowCount: item.metadata.borrowCount ?? 0,
      }))
    }

    return result.items.map((item) => ({
      title: item.label,
      subtitle: item.subtitle,
      borrowCount: item.metadata.borrowCount ?? 0,
      availableCopies: item.metadata.availableCopies ?? 0,
    }))
  }

  private explainRules(ctx: AiContext) {
    return {
      tenant: ctx.tenantName,
      loanPeriodDays: BORROWING_DEFAULTS.loanPeriodDays,
      finePerDay: formatMoneyFromCents(BORROWING_DEFAULTS.finePerDayCents),
      maxFine: formatMoneyFromCents(BORROWING_DEFAULTS.maxFineCents),
      lostPenalty: formatMoneyFromCents(BORROWING_DEFAULTS.lostBookPenaltyCents),
      currency: 'PHP',
      summary: `Books may be borrowed for ${BORROWING_DEFAULTS.loanPeriodDays} days. Late returns incur a daily fine up to the maximum cap. Lost items are charged a replacement penalty.`,
    }
  }

  private async overdueSummary() {
    const stats = await this.borrowingService.dashboardStats()
    const overdue = await this.borrowingService.list({
      status: 'overdue',
      perPage: 10,
    })

    return {
      overdueCount: stats.overdueCount,
      items: overdue.all().map((b) => ({
        transactionNumber: b.transactionNumber,
        memberName: b.member?.fullName,
        bookTitle: b.book?.title,
        dueAt: b.dueAt?.toISO(),
      })),
    }
  }

  private async circulationReport() {
    const stats = await this.borrowingService.dashboardStats()
    const fines = await this.fineService.summary()

    return {
      generatedAt: new Date().toISOString(),
      period: 'current',
      activeLoans: stats.activeLoans,
      overdueCount: stats.overdueCount,
      pendingRequests: stats.pendingRequests,
      statusBreakdown: stats.byStatus,
      finesOutstanding: formatMoneyFromCents(fines.totalOutstandingCents),
      pendingFines: fines.pendingCount,
      note: 'Full PDF export will be available in a future release. This is a live summary.',
    }
  }

  private async searchMembers(query: string, limit: number) {
    const result = await this.searchService.search({
      q: query,
      types: ['member'],
      perPage: Math.min(limit, 10),
    })

    return result.items.map((item) => ({
      name: item.label,
      cardNumber: item.metadata.libraryCardNumber,
      memberType: item.metadata.memberType,
      status: item.metadata.membershipStatus,
      url: item.url,
    }))
  }

  private async shelfLocation(query: string) {
    const tid = borrowingTenantId()
    const books = await Book.query()
      .where('tenant_id', tid)
      .whereNull('deleted_at')
      .where((q) => {
        q.whereILike('title', `%${query}%`).orWhereILike('author_names', `%${query}%`)
      })
      .limit(3)

    const results = []
    for (const book of books) {
      const copies = await BookCopy.query()
        .where('book_id', book.id)
        .where('tenant_id', tid)
        .whereNull('deleted_at')
        .where('status', 'available')
        .orderBy('copy_number', 'asc')

      results.push({
        title: book.title,
        locations: copies.map((c) => ({
          barcode: c.barcode,
          shelf: c.shelfLocation ?? 'Not assigned',
          copyNumber: c.copyNumber,
        })),
      })
    }

    return results
  }
}

export { TOOL_DEFINITIONS }
