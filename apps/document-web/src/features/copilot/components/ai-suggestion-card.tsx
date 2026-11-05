import { cn } from '@/lib/utils'

interface AISuggestionCardProps {
  label: string
  onSelect: (label: string) => void
  disabled?: boolean
}

export function AISuggestionCard({ label, onSelect, disabled }: AISuggestionCardProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onSelect(label)}
      className={cn(
        'inline-flex items-center rounded-full border border-border/70 bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-premium',
        'hover:border-primary/30 hover:bg-muted/40 disabled:opacity-50'
      )}
    >
      {label}
    </button>
  )
}
