import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '../lib/utils'

export type BreadcrumbItem = {
  label: string
  href?: string
  current?: boolean
}

export type BreadcrumbProps = {
  items: BreadcrumbItem[]
  className?: string
  linkAs?: (item: BreadcrumbItem) => ReactNode
}

export function Breadcrumb({ items, className, linkAs }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className={cn('text-sm', className)}>
      <ol className="flex flex-wrap items-center gap-1.5 text-[var(--color-muted-foreground)]">
        {items.map((item, index) => {
          const isLast = index === items.length - 1 || item.current
          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-1.5">
              {index > 0 ? <ChevronRight className="h-3.5 w-3.5 opacity-60" aria-hidden /> : null}
              {isLast ? (
                <span className="font-medium text-[var(--color-ink)]" aria-current="page">
                  {item.label}
                </span>
              ) : linkAs ? (
                linkAs(item)
              ) : item.href ? (
                <a href={item.href} className="hover:text-[var(--color-primary)]">
                  {item.label}
                </a>
              ) : (
                <span>{item.label}</span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
