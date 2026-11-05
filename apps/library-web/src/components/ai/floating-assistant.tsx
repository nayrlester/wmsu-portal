import { useEffect, useRef, useState } from 'react'
import {
  Bot,
  X,
  Send,
  Loader2,
  MessageSquarePlus,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AiMessageContent, getQuickActionIcon } from '@/components/ai/ai-message-content'
import { useAiChat, useAiQuickActions } from '@/hooks/use-ai-assistant'
import { getApiErrorMessage } from '@/lib/api-client'
import type { AiMessage } from '@/types/ai'

interface FloatingAssistantProps {
  open: boolean
  onClose: () => void
}

export function FloatingAssistant({ open, onClose }: FloatingAssistantProps) {
  const [conversationId, setConversationId] = useState<string | undefined>()
  const [messages, setMessages] = useState<AiMessage[]>([])
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  const { data: quickActions } = useAiQuickActions(open)
  const chat = useAiChat()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, chat.isPending])

  async function sendMessage(text: string) {
    const trimmed = text.trim()
    if (!trimmed || chat.isPending) return

    const userMsg: AiMessage = {
      id: `local-${Date.now()}`,
      role: 'user',
      content: trimmed,
    }
    setMessages((prev) => [...prev, userMsg])
    setInput('')

    try {
      const result = await chat.mutateAsync({ message: trimmed, conversationId })
      setConversationId(result.conversationId)
      setMessages((prev) => [...prev, result.message])
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: getApiErrorMessage(error),
        },
      ])
    }
  }

  function startNewConversation() {
    setConversationId(undefined)
    setMessages([])
    setInput('')
  }

  if (!open) return null

  return (
    <div className="fixed bottom-24 right-6 z-50 flex h-[min(560px,calc(100vh-8rem))] w-[min(400px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
      <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-white">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold">Library Assistant</p>
            <p className="text-xs text-blue-100">Search · Rules · Reports</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={startNewConversation}
            className="rounded-lg p-1.5 hover:bg-white/10"
            aria-label="New conversation"
          >
            <MessageSquarePlus className="h-4 w-4" />
          </button>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 hover:bg-white/10" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="space-y-4">
            <div className="rounded-xl bg-slate-50 p-4 text-center">
              <Bot className="mx-auto mb-2 h-8 w-8 text-blue-600" />
              <p className="text-sm font-medium text-slate-900">How can I help?</p>
              <p className="mt-1 text-xs text-slate-500">
                Ask about books, availability, rules, overdue items, or shelf locations.
              </p>
            </div>

            {quickActions && quickActions.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {quickActions.map((action) => {
                  const Icon = getQuickActionIcon(action.icon)
                  return (
                    <button
                      key={action.id}
                      type="button"
                      onClick={() => sendMessage(action.prompt)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:border-blue-300 hover:bg-blue-50"
                    >
                      <Icon className="h-3.5 w-3.5 text-blue-600" />
                      {action.label}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-800'
                  }`}
                >
                  {msg.role === 'assistant' ? (
                    <AiMessageContent content={msg.content} />
                  ) : (
                    <p className="text-sm">{msg.content}</p>
                  )}
                  {msg.provider && msg.role === 'assistant' && (
                    <p className="mt-1 text-[10px] uppercase tracking-wide opacity-60">
                      {msg.provider === 'openai' ? 'AI' : 'Assistant'}
                      {msg.toolsUsed?.length ? ` · ${msg.toolsUsed.join(', ')}` : ''}
                    </p>
                  )}
                </div>
              </div>
            ))}
            {chat.isPending && (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Thinking...
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          sendMessage(input)
        }}
        className="border-t border-slate-100 p-3"
      >
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask the library assistant..."
            disabled={chat.isPending}
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={chat.isPending || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  )
}

export function AiFab({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg transition-transform hover:scale-105 hover:shadow-xl"
      aria-label="Open library assistant"
    >
      <Bot className="h-6 w-6" />
    </button>
  )
}
