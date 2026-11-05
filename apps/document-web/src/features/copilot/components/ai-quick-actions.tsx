import { AISuggestionCard } from '@/features/copilot/components/ai-suggestion-card'
import type { CopilotQuickAction } from '@/features/copilot/types/copilot.types'

interface AIQuickActionsProps {
  actions: CopilotQuickAction[]
  suggestions?: string[]
  onSelect: (prompt: string) => void
  disabled?: boolean
}

export function AIQuickActions({ actions, suggestions, onSelect, disabled }: AIQuickActionsProps) {
  const items = suggestions?.length
    ? suggestions.map((label) => ({ id: label, label, prompt: label }))
    : actions

  if (!items.length) return null

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <AISuggestionCard
          key={item.id}
          label={item.label}
          onSelect={() => onSelect(item.prompt)}
          disabled={disabled}
        />
      ))}
    </div>
  )
}
