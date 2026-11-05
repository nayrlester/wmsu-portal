import { highlightParts } from '@/features/search/utils/search.helpers'

interface HighlightTextProps {
  text: string
  query: string
  className?: string
}

export function HighlightText({ text, query, className }: HighlightTextProps) {
  const parts = highlightParts(text, query)

  return (
    <span className={className}>
      {parts.map((part, index) =>
        part.highlight ? (
          <mark key={index} className="rounded bg-primary/15 px-0.5 text-foreground">
            {part.text}
          </mark>
        ) : (
          <span key={index}>{part.text}</span>
        )
      )}
    </span>
  )
}
