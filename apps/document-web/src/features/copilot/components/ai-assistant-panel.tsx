import { useEffect, useState } from 'react'
import { History, Maximize2, Minimize2, Send, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { useCopilotStore } from '@/features/copilot/store/copilot-store'
import { useCopilot } from '@/features/copilot/hooks/use-copilot'
import { useCopilotQuickActions } from '@/features/copilot/hooks/use-copilot-quick-actions'
import { AIConversationView } from '@/features/copilot/components/ai-conversation-view'
import { AIHistoryDrawer } from '@/features/copilot/components/ai-history-drawer'
import { AIQuickActions } from '@/features/copilot/components/ai-quick-actions'

export function AIAssistantPanel() {
  const [input, setInput] = useState('')
  const { mode, historyOpen, activityFeed, setHistoryOpen, closePanel, setFullscreen, markActivityRead } =
    useCopilotStore()
  const { messages, isSending, sendMessage, confirmAction, cancelAction, resetConversation, ensureWelcome } =
    useCopilot()
  const quickActions = useCopilotQuickActions()

  useEffect(() => {
    if (mode !== 'minimized') {
      ensureWelcome()
      markActivityRead()
    }
  }, [mode, ensureWelcome, markActivityRead])

  if (mode === 'minimized') return null

  const isFullscreen = mode === 'fullscreen'

  const handleSubmit = () => {
    if (!input.trim()) return
    sendMessage(input)
    setInput('')
  }

  return (
    <div
      className={cn(
        'fixed z-50 flex flex-col overflow-hidden border border-border/80 bg-card shadow-2xl animate-page-in',
        isFullscreen
          ? 'inset-0 rounded-none'
          : 'bottom-24 right-4 left-4 max-h-[min(640px,calc(100dvh-7rem))] rounded-xl sm:left-auto sm:w-[400px] lg:bottom-6'
      )}
      role="dialog"
      aria-label="Help desk chat"
    >
      <header className="flex shrink-0 items-center justify-between border-b border-border/60 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-foreground">Help Desk</p>
          <p className="text-xs text-muted-foreground">Document tracking support</p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label="Conversation history"
            onClick={() => setHistoryOpen(!historyOpen)}
          >
            <History className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 hidden sm:inline-flex"
            aria-label={isFullscreen ? 'Exit full screen' : 'Full screen'}
            onClick={() => setFullscreen(!isFullscreen)}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" aria-label="Close assistant" onClick={closePanel}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1 flex-col">
        <AIHistoryDrawer
          open={historyOpen}
          onClose={() => setHistoryOpen(false)}
          messages={messages}
          activityFeed={activityFeed}
          onClear={resetConversation}
        />

        <AIConversationView
          messages={messages}
          quickActions={quickActions}
          onSend={sendMessage}
          onConfirm={confirmAction}
          onCancel={cancelAction}
          isSending={isSending}
        />

        {messages.length <= 1 && (
          <div className="border-t border-border/60 px-4 py-3">
            <AIQuickActions actions={quickActions} onSelect={sendMessage} disabled={isSending} />
          </div>
        )}

        <footer className="shrink-0 border-t border-border/60 p-3">
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSubmit()
                }
              }}
              placeholder="What do you need help with?"
              rows={2}
              className="min-h-[44px] resize-none text-sm"
              disabled={isSending}
            />
            <Button
              type="button"
              size="icon"
              className="h-auto shrink-0 self-end"
              aria-label="Send message"
              disabled={isSending || !input.trim()}
              onClick={handleSubmit}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </footer>
      </div>
    </div>
  )
}
