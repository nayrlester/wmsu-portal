import { MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useCopilotStore } from '@/features/copilot/store/copilot-store'

export function AIAssistantButton() {
  const { mode, togglePanel, unreadActivity } = useCopilotStore()
  const isOpen = mode !== 'minimized'

  return (
    <Button
      type="button"
      size="icon"
      aria-label={isOpen ? 'Close help desk' : 'Open help desk'}
      aria-expanded={isOpen}
      onClick={togglePanel}
      className={cn(
        'fixed bottom-24 right-4 z-50 h-12 w-12 rounded-full shadow-lg lg:bottom-6',
        'bg-primary text-primary-foreground hover:opacity-90',
        isOpen && 'ring-2 ring-primary/30'
      )}
    >
      <MessageSquare className="h-5 w-5" />
      {unreadActivity > 0 && !isOpen && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-white">
          {unreadActivity > 9 ? '9+' : unreadActivity}
        </span>
      )}
    </Button>
  )
}
