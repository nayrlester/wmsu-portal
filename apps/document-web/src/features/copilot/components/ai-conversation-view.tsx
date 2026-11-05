import { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { AIMessageBubble } from '@/features/copilot/components/ai-message-bubble'
import { AIActionCard } from '@/features/copilot/components/ai-action-card'
import { AIQuickActions } from '@/features/copilot/components/ai-quick-actions'
import type { CopilotMessage } from '@/features/copilot/types/copilot.types'
import type { CopilotQuickAction } from '@/features/copilot/types/copilot.types'

interface AIConversationViewProps {
  messages: CopilotMessage[]
  quickActions: CopilotQuickAction[]
  onSend: (text: string) => void
  onConfirm: (actionId: string, messageId: string) => void
  onCancel: (actionId: string, messageId: string) => void
  isSending: boolean
}

export function AIConversationView({
  messages,
  quickActions,
  onSend,
  onConfirm,
  onCancel,
  isSending,
}: AIConversationViewProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant' && !m.isThinking)

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {messages.map((message) => (
          <div key={message.id} className="space-y-3">
            <AIMessageBubble message={message} />

            {message.cards && message.cards.length > 0 && (
              <div className="ml-0 space-y-2 sm:ml-2">
                {message.cards.map((card) => (
                  <AIActionCard key={card.id} card={card} compact />
                ))}
              </div>
            )}

            {message.pendingAction && (
              <div className="ml-0 rounded-lg border border-border/70 bg-muted/20 p-3 sm:ml-2">
                <p className="text-sm font-medium">{message.pendingAction.label}</p>
                <p className="mt-1 text-xs text-muted-foreground">{message.pendingAction.description}</p>
                <div className="mt-3 flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    disabled={isSending}
                    onClick={() => onConfirm(message.pendingAction!.id, message.id)}
                  >
                    {message.pendingAction.confirmLabel}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={isSending}
                    onClick={() => onCancel(message.pendingAction!.id, message.id)}
                  >
                    {message.pendingAction.cancelLabel}
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {lastAssistant?.suggestions && !isSending && (
        <div className="border-t border-border/60 px-4 py-3">
          <AIQuickActions
            actions={quickActions}
            suggestions={lastAssistant.suggestions}
            onSelect={onSend}
            disabled={isSending}
          />
        </div>
      )}
    </div>
  )
}
