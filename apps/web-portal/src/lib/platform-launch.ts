import { useAuthStore } from '@/stores/auth-store'
import type { AuthPlatform } from '@/types/auth'

const PLATFORM_LAUNCH_OVERRIDES: Record<string, string> = {
  enrollment: 'http://127.0.0.1:5180',
  records: 'http://127.0.0.1:5181',
  finance: 'http://127.0.0.1:5182',
  library: 'http://127.0.0.1:5183',
  uims: 'http://127.0.0.1:5184',
  inventory: 'http://127.0.0.1:5184',
  docstrack: 'http://127.0.0.1:5185',
  documents: 'http://127.0.0.1:5185',
  library_opac: 'http://127.0.0.1:5186',
  library_kiosk: 'http://127.0.0.1:5187',
  admin: 'http://127.0.0.1:5174',
}

function isPortalHostedLaunch(launchUrl: string) {
  try {
    const url = new URL(launchUrl)
    return url.origin === window.location.origin && url.pathname.startsWith('/platforms/')
  } catch {
    return false
  }
}

export function resolvePlatformLaunchUrl(platform: AuthPlatform): string | null {
  if (import.meta.env.DEV) {
    const override = PLATFORM_LAUNCH_OVERRIDES[platform.code]
    if (override) return override
  }
  return platform.launchUrl
}

export function resolveSsoLaunchBase(launchUrl: string): string {
  try {
    const url = new URL(launchUrl)
    url.hash = ''
    url.search = ''
    url.pathname = url.pathname
      .replace(/\/+$/, '')
      .replace(/\/(login|signin|sso\/callback)$/i, '')
    return url.origin + (url.pathname === '/' ? '' : url.pathname)
  } catch {
    return launchUrl.replace(/\/$/, '').replace(/\/(login|signin|sso\/callback)$/i, '')
  }
}

export function launchPlatform(
  platform: AuthPlatform,
  accessToken: string,
  refreshToken: string
) {
  const launchUrl = resolvePlatformLaunchUrl(platform)
  if (!launchUrl) return
  if (!accessToken || !refreshToken) {
    window.location.assign('/login')
    return
  }

  if (isPortalHostedLaunch(launchUrl)) {
    window.open(launchUrl, '_blank')
    return
  }

  const base = resolveSsoLaunchBase(launchUrl)
  const useSso =
    platform.requiresSso ||
    platform.code === 'library_kiosk' ||
    platform.code === 'library_opac'
  const url = useSso
    ? `${base}/sso/callback#access_token=${encodeURIComponent(accessToken)}&refresh_token=${encodeURIComponent(refreshToken)}`
    : launchUrl

  window.open(url, '_blank')
}

export function useLaunchPlatform() {
  const accessToken = useAuthStore((s) => s.accessToken)
  const refreshToken = useAuthStore((s) => s.refreshToken)

  return (platform: AuthPlatform) => {
    if (!accessToken || !refreshToken) return
    launchPlatform(platform, accessToken, refreshToken)
  }
}
