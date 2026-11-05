import { useCallback, type MouseEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'

const HEADER_OFFSET_PX = 72

export function scrollToMarketingSection(sectionId: string): void {
  const element = document.getElementById(sectionId)
  if (!element) return

  const top = element.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET_PX
  window.scrollTo({ top, behavior: 'smooth' })
  window.history.replaceState(null, '', `/#${sectionId}`)
}

interface MarketingSectionLinkProps {
  sectionId: string
  label: string
  className?: string
  onNavigate?: () => void
}

export function MarketingSectionLink({
  sectionId,
  label,
  className,
  onNavigate,
}: MarketingSectionLinkProps) {
  const location = useLocation()
  const navigate = useNavigate()

  const handleClick = useCallback(
    (event: MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault()

      if (location.pathname === '/') {
        scrollToMarketingSection(sectionId)
        onNavigate?.()
        return
      }

      navigate({ pathname: '/', hash: sectionId })
      onNavigate?.()
    },
    [location.pathname, navigate, onNavigate, sectionId]
  )

  return (
    <a
      href={`/#${sectionId}`}
      onClick={handleClick}
      className={cn(
        'rounded-lg px-3 py-2 text-sm text-muted-foreground transition-premium hover:bg-muted/60 hover:text-foreground',
        className
      )}
    >
      {label}
    </a>
  )
}
