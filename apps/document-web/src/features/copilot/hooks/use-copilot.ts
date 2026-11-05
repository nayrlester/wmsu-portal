import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { copilotApi } from '@/api/modules/copilot.api'
import { useCopilotStore } from '@/features/copilot/store/copilot-store'
import { useCopilotPageContext } from '@/features/copilot/hooks/use-copilot-context'
import type { CopilotMessage } from '@/features/copilot/types/copilot.types'

function createMessage(partial: Omit<CopilotMessage, 'id' | 'timestamp'> & { id?: string }): CopilotMessage {
  return {
    id: partial.id ?? crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    ...partial,
  }
}

const WELCOME_MESSAGE = createMessage({
  role: 'assistant',
  content:
    "Hey — what do you need? I can look up documents, start a request, pull numbers, or tell you where something is in the approval chain.",
  suggestions: [
    'Find a document',
    'Create a document',
    'Show pending approvals',
    'Generate report',
    'Explain workflow',
    'Search audit logs',
  ],
})

export function useCopilot() {
  const navigate = useNavigate()
  const pageContext = useCopilotPageContext()
  const {
    messages,
    sessionRefs,
    isSending,
    addMessage,
    updateMessage,
    setSessionRefs,
    setSending,
    clearConversation,
  } = useCopilotStore()

  const ensureWelcome = useCallback(() => {
    if (messages.length === 0) {
      addMessage(WELCOME_MESSAGE)
    }
  }, [messages.length, addMessage])

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || isSending) return

      const userMessage = createMessage({ role: 'user', content: trimmed })
      const thinkingId = crypto.randomUUID()
      addMessage(userMessage)
      addMessage({ id: thinkingId, role: 'assistant', content: '', timestamp: new Date().toISOString(), isThinking: true })
      setSending(true)

      try {
        const history = [...messages, userMessage]
          .filter((m) => !m.isThinking)
          .slice(-10)
          .map((m) => ({ role: m.role, content: m.content }))

        const response = await copilotApi.chat({
          message: trimmed,
          pageContext,
          history,
          sessionRefs,
        })

        if (response.sessionRefs?.length) {
          setSessionRefs(response.sessionRefs)
        }

        updateMessage(thinkingId, {
          isThinking: false,
          content: response.content,
          cards: response.cards,
          pendingAction: response.pendingAction,
          suggestions: response.suggestions,
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : "Something went wrong on my end. Mind trying again?"
        updateMessage(thinkingId, {
          isThinking: false,
          content: message,
        })
      } finally {
        setSending(false)
      }
    },
    [isSending, messages, pageContext, sessionRefs, addMessage, updateMessage, setSessionRefs, setSending]
  )

  const confirmAction = useCallback(
    async (actionId: string, messageId: string) => {
      setSending(true)
      try {
        const result = await copilotApi.confirm(actionId)
        updateMessage(messageId, { pendingAction: undefined })

        const assistantMessage = createMessage({
          role: 'assistant',
          content: result.message,
          cards: result.cards,
        })
        addMessage(assistantMessage)

        if (result.href) {
          navigate(result.href)
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "That didn't go through — want to try again?"
        addMessage(createMessage({ role: 'assistant', content: message }))
      } finally {
        setSending(false)
      }
    },
    [addMessage, updateMessage, setSending, navigate]
  )

  const cancelAction = useCallback(
    async (actionId: string, messageId: string) => {
      await copilotApi.cancel(actionId).catch(() => {})
      updateMessage(messageId, { pendingAction: undefined })
      addMessage(createMessage({ role: 'assistant', content: 'No problem — cancelled.' }))
    },
    [addMessage, updateMessage]
  )

  const resetConversation = useCallback(() => {
    clearConversation()
    addMessage(WELCOME_MESSAGE)
  }, [clearConversation, addMessage])

  return {
    messages,
    isSending,
    sendMessage,
    confirmAction,
    cancelAction,
    resetConversation,
    ensureWelcome,
    pageContext,
  }
}
