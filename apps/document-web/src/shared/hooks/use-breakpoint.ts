import { useEffect, useState } from 'react'

export type Breakpoint = 'mobile' | 'tablet' | 'desktop'

const QUERIES = {
  mobile: '(max-width: 639px)',
  tablet: '(min-width: 640px) and (max-width: 1023px)',
  desktop: '(min-width: 1024px)',
} as const

function getBreakpoint(): Breakpoint {
  if (typeof window === 'undefined') return 'desktop'
  if (window.matchMedia(QUERIES.mobile).matches) return 'mobile'
  if (window.matchMedia(QUERIES.tablet).matches) return 'tablet'
  return 'desktop'
}

export function useBreakpoint(): Breakpoint {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>(getBreakpoint)

  useEffect(() => {
    const media = [
      window.matchMedia(QUERIES.mobile),
      window.matchMedia(QUERIES.tablet),
      window.matchMedia(QUERIES.desktop),
    ]

    const update = () => setBreakpoint(getBreakpoint())
    media.forEach((query) => query.addEventListener('change', update))
    return () => media.forEach((query) => query.removeEventListener('change', update))
  }, [])

  return breakpoint
}

export function useIsMobile(): boolean {
  return useBreakpoint() === 'mobile'
}
