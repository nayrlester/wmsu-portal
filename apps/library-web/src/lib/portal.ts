const PORTAL_HOME =
  (import.meta.env.VITE_PORTAL_URL as string | undefined)?.trim()?.replace(/\/$/, '') ||
  'http://127.0.0.1:5173'

export function portalHomeUrl() {
  return PORTAL_HOME
}

export function portalLoginUrl() {
  return `${PORTAL_HOME}/login`
}

export function portalLogoutUrl() {
  return `${PORTAL_HOME}/logout`
}

export function redirectToPortalSignIn() {
  window.location.assign(portalLoginUrl())
}

export function redirectToPortalLogout() {
  window.location.assign(portalLogoutUrl())
}

export function returnToPlatforms(opts?: {
  clearSession?: boolean
  accessToken?: string | null
  refreshToken?: string | null
  onClearSession?: () => void
}) {
  if (opts?.clearSession) {
    opts.onClearSession?.()
    redirectToPortalLogout()
    return
  }
  const accessToken = opts?.accessToken
  const refreshToken = opts?.refreshToken
  if (accessToken && refreshToken) {
    window.location.assign(
      `${portalHomeUrl()}/sso/callback#access_token=${encodeURIComponent(accessToken)}&refresh_token=${encodeURIComponent(refreshToken)}`
    )
    return
  }
  window.location.assign(portalHomeUrl())
}
