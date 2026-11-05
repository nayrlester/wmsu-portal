import { cn } from '@/lib/utils'

interface AIThinkingIndicatorProps {
  className?: string
}

export function AIThinkingIndicator({ className }: AIThinkingIndicatorProps) {
  return (
    <div className={cn('flex items-center gap-1.5 py-1', className)} aria-label="One moment">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 animate-pulse"
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </div>
  )
}
