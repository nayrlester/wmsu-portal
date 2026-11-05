import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface StickyActionBarProps {
  children: ReactNode
  className?: string
}

export function StickyActionBar({ children, className }: StickyActionBarProps) {
  return (
    <div
      className={cn(
        'sticky bottom-16 z-30 -mx-4 border-t border-border bg-background/95 px-4 py-3 backdrop-blur lg:bottom-0 lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none',
        className
      )}
    >
      <div className="flex flex-wrap items-center justify-end gap-2">{children}</div>
    </div>
  )
}
