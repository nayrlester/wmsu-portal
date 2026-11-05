import crypto from 'node:crypto'
import env from '#start/env'
import redis from '@adonisjs/redis/services/main'
import User from '#modules/documents/models/user'
import { tenantOnboardingService } from '#modules/documents/services/tenant_onboarding_service'
import { authService, type AuthTokens } from '#modules/documents/services/auth_service'
import { auditService } from '#modules/documents/services/audit_service'
import { AuditAction } from '#modules/documents/domain/enums/index'

export type OAuthProvider = 'google' | 'microsoft'

interface OAuthProfile {
  providerId: string
  email: string
  fullName: string | null
  avatarUrl: string | null
}

interface OAuthStatePayload {
  provider: OAuthProvider
  redirectUri: string
  tenantId?: string
}

const STATE_TTL_SECONDS = 600

export class OAuthService {
  async getAuthorizationUrl(
    provider: OAuthProvider,
    redirectUri?: string
  ): Promise<{ url: string; state: string }> {
    const state = crypto.randomBytes(24).toString('hex')
    const callbackUri = redirectUri ?? `${env.get('APP_URL')}/api/v1/auth/oauth/${provider}/callback`

    const payload: OAuthStatePayload = { provider, redirectUri: callbackUri }
    await redis.setex(`oauth:state:${state}`, STATE_TTL_SECONDS, JSON.stringify(payload))

    if (provider === 'google') {
      return {
        state,
        url: this.buildGoogleAuthUrl(state, callbackUri),
      }
    }

    return {
      state,
      url: this.buildMicrosoftAuthUrl(state, callbackUri),
    }
  }

  async handleCallback(
    provider: OAuthProvider,
    code: string,
    state: string,
    meta?: { ip?: string; userAgent?: string }
  ): Promise<{ user: User; tokens: AuthTokens; isNewUser: boolean }> {
    const stateKey = `oauth:state:${state}`
    const stateRaw = await redis.get(stateKey)
    if (!stateRaw) {
      throw new Error('Invalid or expired OAuth state')
    }
    await redis.del(stateKey)

    const statePayload = JSON.parse(stateRaw) as OAuthStatePayload
    if (statePayload.provider !== provider) {
      throw new Error('OAuth state provider mismatch')
    }

    const profile =
      provider === 'google'
        ? await this.fetchGoogleProfile(code, statePayload.redirectUri)
        : await this.fetchMicrosoftProfile(code, statePayload.redirectUri)

    const existing = await User.query()
      .where('oauth_provider', provider)
      .where('oauth_provider_id', profile.providerId)
      .whereNull('deleted_at')
      .first()

    if (existing) {
      const tokens = await authService.issueTokensForUser(existing, meta)
      return { user: existing, tokens, isNewUser: false }
    }

    const emailUser = await User.query()
      .where('email', profile.email.toLowerCase())
      .whereNull('deleted_at')
      .first()

    if (emailUser) {
      emailUser.oauthProvider = provider
      emailUser.oauthProviderId = profile.providerId
      if (profile.avatarUrl) emailUser.avatarUrl = profile.avatarUrl
      emailUser.emailVerified = true
      await emailUser.save()

      const tokens = await authService.issueTokensForUser(emailUser, meta)
      return { user: emailUser, tokens, isNewUser: false }
    }

    const user = await this.createOAuthUser(profile, provider)
    const tokens = await authService.issueTokensForUser(user, meta)

    await auditService.log({
      tenantId: user.tenantId,
      userId: user.id,
      action: AuditAction.CREATE,
      entityType: 'user',
      entityId: user.id,
      metadata: { provider, oauth: true },
      ipAddress: meta?.ip,
      userAgent: meta?.userAgent,
    })

    return { user, tokens, isNewUser: true }
  }

  private buildGoogleAuthUrl(state: string, redirectUri: string): string {
    const params = new URLSearchParams({
      client_id: env.get('GOOGLE_CLIENT_ID')!,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      access_type: 'offline',
      prompt: 'consent',
    })
    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
  }

  private buildMicrosoftAuthUrl(state: string, redirectUri: string): string {
    const params = new URLSearchParams({
      client_id: env.get('MICROSOFT_CLIENT_ID')!,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile User.Read',
      state,
      response_mode: 'query',
    })
    return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params}`
  }

  private async fetchGoogleProfile(code: string, redirectUri: string): Promise<OAuthProfile> {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: env.get('GOOGLE_CLIENT_ID')!,
        client_secret: env.get('GOOGLE_CLIENT_SECRET')!,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenRes.ok) {
      throw new Error('Failed to exchange Google authorization code')
    }

    const tokens = (await tokenRes.json()) as { access_token: string }
    const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })

    if (!profileRes.ok) {
      throw new Error('Failed to fetch Google user profile')
    }

    const profile = (await profileRes.json()) as {
      sub: string
      email: string
      name?: string
      picture?: string
    }

    return {
      providerId: profile.sub,
      email: profile.email,
      fullName: profile.name ?? null,
      avatarUrl: profile.picture ?? null,
    }
  }

  private async fetchMicrosoftProfile(code: string, redirectUri: string): Promise<OAuthProfile> {
    const tokenRes = await fetch(
      'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: env.get('MICROSOFT_CLIENT_ID')!,
          client_secret: env.get('MICROSOFT_CLIENT_SECRET')!,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      }
    )

    if (!tokenRes.ok) {
      throw new Error('Failed to exchange Microsoft authorization code')
    }

    const tokens = (await tokenRes.json()) as { access_token: string }
    const profileRes = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })

    if (!profileRes.ok) {
      throw new Error('Failed to fetch Microsoft user profile')
    }

    const profile = (await profileRes.json()) as {
      id: string
      mail?: string
      userPrincipalName?: string
      displayName?: string
    }

    return {
      providerId: profile.id,
      email: (profile.mail ?? profile.userPrincipalName)!,
      fullName: profile.displayName ?? null,
      avatarUrl: null,
    }
  }

  private async createOAuthUser(profile: OAuthProfile, provider: OAuthProvider): Promise<User> {
    const orgName = `${profile.fullName ?? profile.email.split('@')[0]}'s Organization`

    const onboarded = await tenantOnboardingService.onboardOrganization({
      name: orgName,
      owner: {
        email: profile.email,
        password: crypto.randomBytes(32).toString('hex'),
        fullName: profile.fullName ?? profile.email,
      },
    })

    const user = onboarded.owner!
    user.oauthProvider = provider
    user.oauthProviderId = profile.providerId
    user.avatarUrl = profile.avatarUrl
    user.emailVerified = true
    await user.save()

    return user
  }
}

export const oauthService = new OAuthService()
