const PORTAL_HOME =
  (import.meta.env.VITE_PORTAL_URL as string | undefined)?.trim()?.replace(/\/$/, '') ||
  'http://127.0.0.1:5173'

export function portalHomeUrl() {
  return PORTAL_HOME
}

export function returnToPlatforms(opts?: {
  accessToken?: string | null
  refreshToken?: string | null
}) {
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
