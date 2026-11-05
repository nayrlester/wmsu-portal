import { logoutApi } from '@/lib/auth-api'
import { PLATFORM_LAUNCH_OVERRIDES } from '@/lib/platform-launch'
import { useAuthStore } from '@/stores/auth-store'
import type { AuthPlatform } from '@/types/auth'

const LOGOUT_TIMEOUT_MS = 2500
const API_LOGOUT_TIMEOUT_MS = 3000
export const SSO_LOGOUT_MESSAGE = 'wmsu-sso-logout-done'

function uniqueOrigins(urls: string[]): string[] {
  const origins = new Set<string>()
  for (const raw of urls) {
    try {
      const origin = new URL(raw).origin
      if (origin && origin !== window.location.origin) origins.add(origin)
    } catch {
      /* skip invalid */
    }
  }
  return [...origins]
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | void> {
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => resolve(undefined), ms)
    promise
      .then((value) => {
        window.clearTimeout(timer)
        resolve(value)
      })
      .catch(() => {
        window.clearTimeout(timer)
        resolve(undefined)
      })
  })
}

export function resolveCampusLogoutOrigins(platforms: AuthPlatform[] = []): string[] {
  const urls = platforms
    .map((platform) => {
      if (import.meta.env.DEV) {
        const override = PLATFORM_LAUNCH_OVERRIDES[platform.code]
        if (override) return override
      }
      return platform.launchUrl
    })
    .filter((u): u is string => Boolean(u?.trim()))

  return uniqueOrigins(urls)
}

function clearPlatformSessionsViaIframes(origins: string[]): Promise<void> {
  if (!origins.length) return Promise.resolve()

  return new Promise((resolve) => {
    const pending = new Set(origins)
    const iframes: HTMLIFrameElement[] = []
    let settled = false

    const finish = () => {
      if (settled) return
      settled = true
      window.clearTimeout(timer)
      window.removeEventListener('message', onMessage)
      for (const iframe of iframes) iframe.remove()
      resolve()
    }

    const onMessage = (event: MessageEvent) => {
      const data = event.data as { type?: string } | null
      if (!data || data.type !== SSO_LOGOUT_MESSAGE) return
      if (!pending.has(event.origin)) return
      pending.delete(event.origin)
      if (pending.size === 0) finish()
    }

    window.addEventListener('message', onMessage)
    const timer = window.setTimeout(finish, LOGOUT_TIMEOUT_MS)

    for (const origin of origins) {
      const iframe = document.createElement('iframe')
      iframe.setAttribute('aria-hidden', 'true')
      iframe.style.cssText =
        'position:fixed;width:1px;height:1px;border:0;opacity:0;pointer-events:none;left:-9999px;top:-9999px'
      iframe.src = `${origin}/sso/logout`
      document.body.appendChild(iframe)
      iframes.push(iframe)
    }
  })
}

export async function performGlobalLogout(options?: { redirectToLogin?: boolean }) {
  const { refreshToken, platforms, logout } = useAuthStore.getState()
  const origins = resolveCampusLogoutOrigins(platforms)

  await withTimeout(logoutApi(refreshToken ?? undefined), API_LOGOUT_TIMEOUT_MS)
  await clearPlatformSessionsViaIframes(origins)
  logout()

  if (options?.redirectToLogin !== false) {
    window.location.assign('/login')
  }
}
