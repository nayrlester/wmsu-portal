import {
  BookOpen,
  CheckCircle,
  Sparkles,
  Info,
  AlertTriangle,
  BarChart3,
  MapPin,
  User,
  Bot,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const ICON_MAP: Record<string, LucideIcon> = {
  book: BookOpen,
  check: CheckCircle,
  sparkles: Sparkles,
  info: Info,
  alert: AlertTriangle,
  chart: BarChart3,
  map: MapPin,
  user: User,
}

export function getQuickActionIcon(icon: string): LucideIcon {
  return ICON_MAP[icon] ?? Bot
}

function renderInlineMarkdown(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-semibold text-slate-900">
          {part.slice(2, -2)}
        </strong>
      )
    }
    return part
  })
}

export function AiMessageContent({ content }: { content: string }) {
  const lines = content.split('\n')

  return (
    <div className="space-y-1 text-sm leading-relaxed text-slate-700">
      {lines.map((line, idx) => {
        if (!line.trim()) return <br key={idx} />
        if (line.startsWith('- ')) {
          return (
            <p key={idx} className="pl-2">
              • {renderInlineMarkdown(line.slice(2))}
            </p>
          )
        }
        if (/^\d+\.\s/.test(line)) {
          return (
            <p key={idx} className="pl-1">
              {renderInlineMarkdown(line)}
            </p>
          )
        }
        return <p key={idx}>{renderInlineMarkdown(line)}</p>
      })}
    </div>
  )
}
