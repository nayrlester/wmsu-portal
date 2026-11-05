import type { HttpContext } from '@adonisjs/core/http'
import env from '#start/env'
import { oauthService, type OAuthProvider } from '#modules/documents/services/oauth_service'

export default class OauthController {
  async redirect({ params, request, response }: HttpContext) {
    const provider = params.provider as OAuthProvider

    if (!['google', 'microsoft'].includes(provider)) {
      return response.badRequest({ error: 'Unsupported OAuth provider' })
    }

    const clientId =
      provider === 'google' ? env.get('GOOGLE_CLIENT_ID') : env.get('MICROSOFT_CLIENT_ID')

    if (!clientId) {
      return response.serviceUnavailable({
        error: `${provider} OAuth is not configured`,
      })
    }

    const redirectUri = request.input('redirectUri')
    const { url } = await oauthService.getAuthorizationUrl(provider, redirectUri)

    return response.ok({ authorizationUrl: url })
  }

  async callback({ params, request, response }: HttpContext) {
    const provider = params.provider as OAuthProvider
    const code = request.input('code')
    const state = request.input('state')
    const error = request.input('error')

    if (error) {
      return response.badRequest({ error: `OAuth denied: ${error}` })
    }

    if (!code || !state) {
      return response.badRequest({ error: 'Missing code or state parameter' })
    }

    const result = await oauthService.handleCallback(provider, code, state, {
      ip: request.ip(),
      userAgent: request.header('user-agent'),
    })

    const frontendUrl = env.get('FRONTEND_URL')

    if (request.accepts(['html', 'json']) === 'html' && frontendUrl) {
      const params = new URLSearchParams({
        accessToken: result.tokens.accessToken,
        refreshToken: result.tokens.refreshToken,
        isNewUser: String(result.isNewUser),
      })
      return response.redirect(`${frontendUrl}/oauth/callback?${params}`)
    }

    return response.ok({
      user: {
        id: result.user.id,
        email: result.user.email,
        fullName: result.user.fullName,
        tenantId: result.user.tenantId,
      },
      tokens: result.tokens,
      isNewUser: result.isNewUser,
    })
  }
}
