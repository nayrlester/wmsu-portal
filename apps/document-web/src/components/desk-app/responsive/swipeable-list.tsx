import { useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface SwipeableListItem {
  id: string
  content: ReactNode
}

export interface SwipeableListProps {
  items: SwipeableListItem[]
  onSwipeLeft?: (id: string) => void
  onSwipeRight?: (id: string) => void
  className?: string
}

const SWIPE_THRESHOLD = 72

export function SwipeableList({ items, onSwipeLeft, onSwipeRight, className }: SwipeableListProps) {
  return (
    <ul className={cn('space-y-3', className)} role="list">
      {items.map((item) => (
        <SwipeableListRow
          key={item.id}
          id={item.id}
          onSwipeLeft={onSwipeLeft}
          onSwipeRight={onSwipeRight}
        >
          {item.content}
        </SwipeableListRow>
      ))}
    </ul>
  )
}

function SwipeableListRow({
  id,
  children,
  onSwipeLeft,
  onSwipeRight,
}: {
  id: string
  children: ReactNode
  onSwipeLeft?: (id: string) => void
  onSwipeRight?: (id: string) => void
}) {
  const startX = useRef(0)
  const [offset, setOffset] = useState(0)

  return (
    <li
      className="touch-pan-y overflow-hidden rounded-lg"
      onTouchStart={(event) => {
        startX.current = event.touches[0]?.clientX ?? 0
      }}
      onTouchMove={(event) => {
        const currentX = event.touches[0]?.clientX ?? 0
        setOffset(currentX - startX.current)
      }}
      onTouchEnd={() => {
        if (offset > SWIPE_THRESHOLD) onSwipeRight?.(id)
        if (offset < -SWIPE_THRESHOLD) onSwipeLeft?.(id)
        setOffset(0)
      }}
    >
      <div
        className="transition-transform duration-200 ease-out motion-reduce:transition-none"
        style={{ transform: `translateX(${offset}px)` }}
      >
        {children}
      </div>
    </li>
  )
}
