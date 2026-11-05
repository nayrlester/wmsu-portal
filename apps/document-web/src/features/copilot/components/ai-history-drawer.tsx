import { History, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { CopilotActivityEvent, CopilotMessage } from '@/features/copilot/types/copilot.types'

interface AIHistoryDrawerProps {
  open: boolean
  onClose: () => void
  messages: CopilotMessage[]
  activityFeed: CopilotActivityEvent[]
  onClear: () => void
}

export function AIHistoryDrawer({ open, onClose, messages, activityFeed, onClear }: AIHistoryDrawerProps) {
  if (!open) return null

  const userMessages = messages.filter((m) => m.role === 'user' && !m.isThinking)

  return (
    <>
      <button
        type="button"
        className="absolute inset-0 z-10 bg-foreground/5"
        aria-label="Close history"
        onClick={onClose}
      />
      <aside
        className={cn(
          'absolute inset-y-0 right-0 z-20 flex w-72 flex-col border-l border-border/70 bg-card shadow-lg animate-page-in'
        )}
      >
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <History className="h-4 w-4 text-muted-foreground" />
            History
          </div>
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {activityFeed.length > 0 && (
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Activity
              </h3>
              <ul className="space-y-2">
                {activityFeed.slice(0, 10).map((event) => (
                  <li key={event.id} className="rounded-md border border-border/60 bg-background p-2.5">
                    <p className="text-xs font-medium">{event.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{event.message}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Your prompts
            </h3>
            {userMessages.length === 0 ? (
              <p className="text-xs text-muted-foreground">No messages yet — ask anything above.</p>
            ) : (
              <ul className="space-y-2">
                {userMessages.slice(-15).reverse().map((message) => (
                  <li key={message.id} className="rounded-md border border-border/60 bg-background p-2.5">
                    <p className="text-xs line-clamp-3">{message.content}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="border-t border-border/60 p-3">
          <Button type="button" variant="outline" size="sm" className="w-full gap-2" onClick={onClear}>
            <Trash2 className="h-3.5 w-3.5" />
            Clear conversation
          </Button>
        </div>
      </aside>
    </>
  )
}
