import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { portalApplyUrl } from '@/lib/portal'

export function PortalApplyRedirect() {
  const location = useLocation()

  useEffect(() => {
    const target = portalApplyUrl(`${location.pathname}${location.search}${location.hash}`)
    window.location.replace(target)
  }, [location.hash, location.pathname, location.search])

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 text-sm text-slate-600">
      Redirecting to WMSU Portal admissions…
    </div>
  )
}
