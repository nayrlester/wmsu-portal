const PORTAL_HOME =
  (import.meta.env.VITE_PORTAL_URL as string | undefined)?.trim()?.replace(/\/$/, '') ||
  'http://127.0.0.1:5173'

export function portalLoginUrl() {
  return `${PORTAL_HOME}/login`
}

export function redirectToPortalSignIn() {
  window.location.assign(portalLoginUrl())
}
