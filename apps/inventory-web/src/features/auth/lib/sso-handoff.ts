const HANDOFF_KEY = 'identity_sso_handoff'

type SsoTokens = {
  accessToken: string
  refreshToken: string
}

let memoryHandoff: SsoTokens | null = null

function readStored(): SsoTokens | null {
  if (memoryHandoff) return memoryHandoff
  try {
    const raw = sessionStorage.getItem(HANDOFF_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<SsoTokens>
    if (parsed.accessToken && parsed.refreshToken) {
      memoryHandoff = {
        accessToken: parsed.accessToken,
        refreshToken: parsed.refreshToken,
      }
      return memoryHandoff
    }
  } catch {
    /* ignore corrupt storage */
  }
  return null
}

function persist(tokens: SsoTokens) {
  memoryHandoff = tokens
  try {
    sessionStorage.setItem(HANDOFF_KEY, JSON.stringify(tokens))
  } catch {
    /* private mode / quota — memory cache still works for Strict Mode */
  }
}

export function consumeSsoHandoffTokens(): SsoTokens | null {
  const hash = window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : window.location.hash
  const params = new URLSearchParams(hash)
  const accessToken = params.get('access_token')
  const refreshToken = params.get('refresh_token')

  if (accessToken && refreshToken) {
    const tokens = { accessToken, refreshToken }
    persist(tokens)
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`)
    return tokens
  }

  return readStored()
}

export function clearSsoHandoffTokens() {
  memoryHandoff = null
  try {
    sessionStorage.removeItem(HANDOFF_KEY)
  } catch {
    /* ignore */
  }
}

export function ssoErrorMessage(err: unknown, fallback = 'SSO sign-in failed. Try local login.') {
  if (err && typeof err === 'object' && 'response' in err) {
    const axiosErr = err as {
      response?: { status?: number; data?: Record<string, unknown> }
    }
    const data = axiosErr.response?.data
    if (data) {
      if (typeof data.message === 'string' && data.message) return data.message
      if (typeof data.error === 'string' && data.error) return data.error
      const errors = data.errors
      if (Array.isArray(errors) && errors[0]) {
        const first = errors[0] as { message?: string }
        if (first.message) return first.message
      }
    }
    if (axiosErr.response?.status === 404) {
      return 'UIMS API not found at VITE_API_URL. Set VITE_API_URL to /api/v1/inventory (Base API :3500) and restart the web app.'
    }
    if (axiosErr.response?.status === 401) {
      return 'UIMS API rejected the Identity token. Confirm AUTH_MODE=dual and PLATFORM_* match Identity JWT_ISSUER / JWKS.'
    }
  }
  if (err instanceof Error && err.message) {
    if (/^Request failed with status code \d+$/i.test(err.message)) return fallback
    if (/network error|failed to fetch|err_network|econnrefused/i.test(err.message)) {
      return 'Cannot reach UIMS API. Confirm Base API is running on port 3500, then try again.'
    }
    return err.message
  }
  return fallback
}
