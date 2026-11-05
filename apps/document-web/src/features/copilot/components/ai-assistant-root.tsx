import { AIAssistantButton } from '@/features/copilot/components/ai-assistant-button'
import { AIAssistantPanel } from '@/features/copilot/components/ai-assistant-panel'
import { useCopilotRealtime } from '@/features/copilot/hooks/use-copilot-realtime'
import { useCopilotSessionSync } from '@/features/copilot/hooks/use-copilot-session-sync'

export function AIAssistantRoot() {
  useCopilotSessionSync()
  useCopilotRealtime()

  return (
    <div className="[[data-dialog-open]_&]:pointer-events-none [[data-dialog-open]_&]:invisible">
      <AIAssistantButton />
      <AIAssistantPanel />
    </div>
  )
}
