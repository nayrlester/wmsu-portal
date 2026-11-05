import { cn } from '@/lib/utils'
import type { CopilotMessage } from '@/features/copilot/types/copilot.types'
import { AIThinkingIndicator } from '@/features/copilot/components/ai-thinking-indicator'

interface AIMessageBubbleProps {
  message: CopilotMessage
}

export function AIMessageBubble({ message }: AIMessageBubbleProps) {
  const isUser = message.role === 'user'

  if (message.isThinking) {
    return (
      <div className="flex justify-start">
        <div className="rounded-lg border border-border/60 bg-card px-4 py-3 shadow-sm">
          <AIThinkingIndicator />
        </div>
      </div>
    )
  }

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[85%] rounded-lg px-4 py-2.5 text-sm leading-relaxed',
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'border border-border/60 bg-card text-foreground shadow-sm'
        )}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>
      </div>
    </div>
  )
}
