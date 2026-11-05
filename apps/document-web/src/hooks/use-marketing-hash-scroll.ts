import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { scrollToMarketingSection } from '@/components/marketing/marketing-section-link'

export function useMarketingHashScroll(): void {
  const location = useLocation()

  useEffect(() => {
    if (location.pathname !== '/' || !location.hash) return

    const sectionId = location.hash.replace('#', '')
    if (!sectionId) return

    const timer = window.setTimeout(() => {
      scrollToMarketingSection(sectionId)
    }, 0)

    return () => window.clearTimeout(timer)
  }, [location.pathname, location.hash])
}
