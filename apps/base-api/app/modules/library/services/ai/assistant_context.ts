import { DateTime } from 'luxon'
import { BORROWING_DEFAULTS } from '#modules/library/services/borrowing/borrowing_settings'
import type { AiContext } from '#modules/library/services/ai/ai_types'
import { formatMoneyFromCents } from '#modules/library/helpers/currency'

export function buildSystemPrompt(ctx: AiContext, availableTools: string[]): string {
  const today = DateTime.now().toFormat('MMMM d, yyyy')

  return [
    `You are the library assistant for ${ctx.tenantName} (${ctx.tenantType}).`,
    `Tenant slug: ${ctx.tenantSlug}. Today: ${today}.`,
    `Current user: ${ctx.userName} (${ctx.userEmail}), roles: ${ctx.roles.join(', ') || 'none'}.`,
    '',
    'Borrowing rules:',
    `- Loan period: ${BORROWING_DEFAULTS.loanPeriodDays} days`,
    `- Currency: PHP (Philippine Peso)`,
    `- Late fine: ${formatMoneyFromCents(BORROWING_DEFAULTS.finePerDayCents)}/day (max ${formatMoneyFromCents(BORROWING_DEFAULTS.maxFineCents)})`,
    `- Lost book penalty: ${formatMoneyFromCents(BORROWING_DEFAULTS.lostBookPenaltyCents)}`,
    '',
    'Guidelines:',
    '- Answer only using library data from available tools.',
    '- Never invent catalog records, availability, or member details.',
    '- Be concise and helpful. Use bullet lists for multiple items.',
    '- If a tool is unavailable due to permissions, explain politely.',
    '',
    `Available tools: ${availableTools.join(', ') || 'none'}.`,
  ].join('\n')
}

export function getQuickActions(ctx: AiContext) {
  const actions: Array<{ id: string; label: string; prompt: string; icon: string; permission?: string }> =
    [
      {
        id: 'search-books',
        label: 'Find a book',
        prompt: 'Search the catalog for popular fiction books',
        icon: 'book',
        permission: 'books:read',
      },
      {
        id: 'availability',
        label: 'Check availability',
        prompt: 'Which books are available to borrow right now?',
        icon: 'check',
        permission: 'books:read',
      },
      {
        id: 'recommend',
        label: 'Recommendations',
        prompt: 'Recommend books based on what is most borrowed',
        icon: 'sparkles',
        permission: 'books:read',
      },
      {
        id: 'rules',
        label: 'Library rules',
        prompt: 'Explain the borrowing rules and fine policy',
        icon: 'info',
      },
      {
        id: 'overdue',
        label: 'Overdue items',
        prompt: 'Show a summary of overdue borrowings',
        icon: 'alert',
        permission: 'borrowings:read',
      },
      {
        id: 'report',
        label: 'Circulation report',
        prompt: 'Generate a circulation summary report for this month',
        icon: 'chart',
        permission: 'borrowings:read',
      },
      {
        id: 'shelf',
        label: 'Shelf location',
        prompt: 'Help me find shelf locations for available books',
        icon: 'map',
        permission: 'books:read',
      },
      {
        id: 'members',
        label: 'Find member',
        prompt: 'Search for a library member by name',
        icon: 'user',
        permission: 'members:read',
      },
    ]

  return actions.filter((a) => !a.permission || ctx.permissions.includes(a.permission))
}
