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
    /* ignore */
  }
  return null
}

function persist(tokens: SsoTokens) {
  memoryHandoff = tokens
  try {
    sessionStorage.setItem(HANDOFF_KEY, JSON.stringify(tokens))
  } catch {
    /* ignore */
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
