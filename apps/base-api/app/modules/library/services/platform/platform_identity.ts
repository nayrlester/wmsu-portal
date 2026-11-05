import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose'
import env from '#start/env'

export interface PlatformAccessClaims {
  sub: string
  email: string
  org_id: string
  org_slug?: string
  roles: string[]
  permissions: string[]
  apps: Record<string, string>
  sid: string
  typ: 'access'
}

let jwks: JWTVerifyGetKey | null = null

function getJwks(): JWTVerifyGetKey {
  if (!jwks) {
    const url =
      env.get('PLATFORM_JWKS_URL') ??
      `${(env.get('PLATFORM_IDENTITY_URL') ?? 'http://127.0.0.1:3411').replace(/\/$/, '')}/.well-known/jwks.json`
    jwks = createRemoteJWKSet(new URL(url))
  }
  return jwks
}

export function getAuthMode(): 'local' | 'platform' | 'dual' {
  const mode = env.get('AUTH_MODE')
  if (mode === 'platform' || mode === 'dual' || mode === 'local') {
    return mode
  }
  return 'local'
}

export async function verifyPlatformAccessToken(token: string): Promise<PlatformAccessClaims> {
  const { payload } = await jwtVerify(token, getJwks(), {
    issuer: env.get('PLATFORM_JWT_ISSUER') ?? 'http://localhost:3411',
    audience: env.get('PLATFORM_JWT_AUDIENCE') ?? 'enterprise',
    algorithms: ['RS256'],
    // Tolerate small Identity ↔ Library host clock skew.
    clockTolerance: 120,
  })

  if (!payload.sub || typeof payload.sub !== 'string') {
    throw new Error('Invalid platform token subject')
  }
  if (payload.typ !== 'access') {
    throw new Error('Invalid platform token type')
  }
  if (typeof payload.org_id !== 'string' || typeof payload.sid !== 'string') {
    throw new Error('Invalid platform token claims')
  }

  return {
    sub: payload.sub,
    email: String(payload.email ?? ''),
    org_id: payload.org_id,
    org_slug: typeof payload.org_slug === 'string' ? payload.org_slug : undefined,
    roles: Array.isArray(payload.roles) ? payload.roles.map(String) : [],
    permissions: Array.isArray(payload.permissions) ? payload.permissions.map(String) : [],
    apps:
      payload.apps && typeof payload.apps === 'object' && !Array.isArray(payload.apps)
        ? (payload.apps as Record<string, string>)
        : {},
    sid: payload.sid,
    typ: 'access',
  }
}

export class PlatformIdentityClient {
  private baseUrl: string

  constructor() {
    this.baseUrl = (env.get('PLATFORM_IDENTITY_URL') ?? 'http://127.0.0.1:3411').replace(/\/$/, '')
  }

  async login(email: string, password: string, organizationId?: string) {
    return this.post<{
      mfaRequired?: boolean
      mfaChallengeToken?: string
      tokens?: {
        accessToken: string
        refreshToken: string
        expiresIn: number
        tokenType: string
      }
    }>('/api/v1/auth/login', { email, password, organizationId })
  }

  async refresh(refreshToken: string) {
    return this.post<{
      tokens: {
        accessToken: string
        refreshToken: string
        expiresIn: number
        tokenType: string
      }
    }>('/api/v1/auth/refresh', { refreshToken })
  }

  async logout(accessToken: string, refreshToken?: string) {
    await this.post(
      '/api/v1/auth/logout',
      { refreshToken },
      { Authorization: `Bearer ${accessToken}` }
    )
  }

  async me(accessToken: string) {
    return this.get<{
      user: { id: string; email: string; fullName: string | null }
      organization: {
        id: string
        slug: string
        apps: Record<string, string>
      } | null
      roles: string[]
      permissions: string[]
    }>('/api/v1/auth/me', { Authorization: `Bearer ${accessToken}` })
  }

  private async get<T>(path: string, headers: Record<string, string> = {}): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      headers: { Accept: 'application/json', ...headers },
    })
    const body = (await res.json()) as { data?: T; error?: string }
    if (!res.ok) throw new Error(body.error ?? `Identity GET ${path} failed`)
    return (body.data ?? body) as T
  }

  private async post<T>(
    path: string,
    payload: unknown,
    headers: Record<string, string> = {}
  ): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(payload),
    })
    const body = (await res.json()) as { data?: T; error?: string }
    if (!res.ok) throw new Error(body.error ?? `Identity POST ${path} failed`)
    return (body.data ?? body) as T
  }
}
