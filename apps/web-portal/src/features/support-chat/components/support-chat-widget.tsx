import { useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowUpRight,
  BookOpen,
  Bot,
  Headset,
  Send,
  X,
} from 'lucide-react'
import {
  getUserManualLinks,
  welcomeAnswer,
  type SupportAnswer,
  type SupportLink,
} from '@/features/support-chat/data/knowledge'
import { answerSupportQuestion } from '@/features/support-chat/lib/answer-support-question'
import clsx from 'clsx'

type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  text: string
  links?: SupportLink[]
  suggestions?: string[]
}

type PanelTab = 'chat' | 'manuals'

function LinkCards({ links }: { links: SupportLink[] }) {
  return (
    <ul className="mt-2 space-y-1.5">
      {links.map((link) => {
        const external = link.href.startsWith('http') || link.href.endsWith('.html')
        const className =
          'group flex items-start gap-2 rounded-xl bg-white/90 px-3 py-2 text-left ring-1 ring-[#dde1f5] transition hover:ring-[#635bff]/40'

        const content = (
          <>
            <BookOpen className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#635bff]" />
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-semibold text-[#12122a] group-hover:text-[#635bff]">
                {link.label}
              </span>
              {link.description && (
                <span className="mt-0.5 block text-[11px] leading-snug text-[#6b6f8c]">
                  {link.description}
                </span>
              )}
            </span>
            <ArrowUpRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#9aa0c3] transition group-hover:text-[#635bff]" />
          </>
        )

        return (
          <li key={`${link.href}-${link.label}`}>
            {external ? (
              <a href={link.href} target="_blank" rel="noopener noreferrer" className={className}>
                {content}
              </a>
            ) : (
              <Link to={link.href} className={className}>
                {content}
              </Link>
            )}
          </li>
        )
      })}
    </ul>
  )
}

function MessageText({ text }: { text: string }) {
  const paragraphs = text.split(/\n\n+/)
  return (
    <div className="space-y-2">
      {paragraphs.map((paragraph) => (
        <p key={paragraph.slice(0, 24)} className="whitespace-pre-line">
          {paragraph}
        </p>
      ))}
    </div>
  )
}

function toAssistantMessage(answer: SupportAnswer, id: string): ChatMessage {
  return {
    id,
    role: 'assistant',
    text: answer.text,
    links: answer.links,
    suggestions: answer.suggestions,
  }
}

export function SupportChatWidget() {
  const panelId = useId()
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<PanelTab>('chat')
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    toAssistantMessage(welcomeAnswer, 'welcome'),
  ])
  const [typing, setTyping] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const manuals = getUserManualLinks()

  const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant')
  const followUps =
    !typing && lastAssistant?.suggestions?.length ? lastAssistant.suggestions : []

  useEffect(() => {
    if (!open) return
    const node = listRef.current
    if (node) node.scrollTop = node.scrollHeight
  }, [messages, typing, open, tab, followUps])

  useEffect(() => {
    if (open && tab === 'chat') {
      window.setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open, tab])

  function pushAnswer(question: string) {
    const recentAssistantText =
      [...messages].reverse().find((m) => m.role === 'assistant')?.text ?? ''

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: question,
    }
    setMessages((prev) => [...prev, userMsg])
    setTyping(true)

    const delay = 450 + Math.min(question.length * 8, 400)
    window.setTimeout(() => {
      const answer = answerSupportQuestion(question, recentAssistantText)
      setMessages((prev) => [...prev, toAssistantMessage(answer, `a-${Date.now()}`)])
      setTyping(false)
    }, delay)
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const question = input.trim()
    if (!question || typing) return
    setInput('')
    pushAnswer(question)
  }

  return (
    <div className="pointer-events-none fixed bottom-20 right-5 z-50 flex flex-col items-end gap-3 sm:bottom-24 sm:right-6">
      {open && (
        <section
          id={panelId}
          role="dialog"
          aria-label="Support chatbot"
          className="pointer-events-auto flex h-[min(34rem,calc(100vh-9rem))] w-[min(24rem,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-[1.5rem] border border-[#dde1f5] bg-white shadow-[0_24px_60px_-28px_rgba(47,42,107,0.55)] animate-fade-up"
        >
          <header className="flex items-center justify-between gap-3 bg-gradient-to-r from-[#635bff] to-[#7a63ff] px-4 py-3.5 text-white">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25">
                <Bot className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">Support assistant</p>
                <p className="truncate text-xs text-white/75">Online · usually replies instantly</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20"
              aria-label="Close support chat"
            >
              <X className="h-4 w-4" />
            </button>
          </header>

          <div className="flex gap-1 border-b border-[#dde1f5] bg-[#f8f9ff] px-3 py-2">
            {(
              [
                { id: 'chat', label: 'Chat' },
                { id: 'manuals', label: 'User manuals' },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={clsx(
                  'flex-1 rounded-full px-3 py-1.5 text-xs font-semibold transition',
                  tab === item.id
                    ? 'bg-white text-[#635bff] shadow-sm'
                    : 'text-[#6b6f8c] hover:text-[#12122a]'
                )}
              >
                {item.label}
              </button>
            ))}
          </div>

          {tab === 'chat' ? (
            <>
              <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={clsx(
                      'flex',
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    <div
                      className={clsx(
                        'max-w-[92%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
                        message.role === 'user'
                          ? 'rounded-br-md bg-gradient-to-r from-[#635bff] to-[#7a63ff] text-white'
                          : 'rounded-bl-md bg-[#f3f4ff] text-[#12122a]'
                      )}
                    >
                      <MessageText text={message.text} />
                      {message.links && message.links.length > 0 && (
                        <LinkCards links={message.links} />
                      )}
                    </div>
                  </div>
                ))}

                {typing && (
                  <div className="flex justify-start">
                    <div className="flex items-center gap-1 rounded-2xl rounded-bl-md bg-[#f3f4ff] px-3.5 py-3">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#9aa0c3]" />
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#9aa0c3] [animation-delay:150ms]" />
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#9aa0c3] [animation-delay:300ms]" />
                    </div>
                  </div>
                )}

                {followUps.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {followUps.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        disabled={typing}
                        onClick={() => pushAnswer(prompt)}
                        className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-[#635bff] ring-1 ring-[#dde1f5] transition hover:bg-[#f3f4ff] disabled:opacity-60"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <form
                onSubmit={onSubmit}
                className="flex items-center gap-2 border-t border-[#dde1f5] bg-white px-3 py-3"
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type a message…"
                  className="h-10 flex-1 rounded-full bg-[#f3f4ff] px-4 text-sm text-[#12122a] outline-none ring-[#635bff]/30 placeholder:text-[#9aa0c3] focus:ring-2"
                  disabled={typing}
                />
                <button
                  type="submit"
                  disabled={typing || !input.trim()}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-[#635bff] to-[#7a63ff] text-white transition hover:brightness-105 disabled:opacity-50"
                  aria-label="Send message"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 overflow-y-auto px-3 py-3">
              <p className="mb-3 text-xs leading-relaxed text-[#6b6f8c]">
                Official user manuals for Unified Access and connected platforms.
              </p>
              <LinkCards links={manuals} />
              <Link
                to="/support"
                onClick={() => setOpen(false)}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#f3f4ff] px-4 py-2.5 text-sm font-semibold text-[#635bff] transition hover:bg-[#e8eaff]"
              >
                Open full Support center
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          )}
        </section>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? 'Close support chatbot' : 'Open support chatbot'}
        className={clsx(
          'pointer-events-auto inline-flex h-14 w-14 items-center justify-center rounded-full text-white shadow-[0_18px_40px_-16px_rgba(47,42,107,0.7)] transition hover:scale-105 hover:brightness-105',
          'bg-gradient-to-br from-[#635bff] to-[#7a63ff]'
        )}
      >
        {open ? <X className="h-6 w-6" /> : <Headset className="h-6 w-6" />}
      </button>
    </div>
  )
}
