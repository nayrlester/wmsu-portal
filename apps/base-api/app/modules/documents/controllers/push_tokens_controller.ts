import type { HttpContext } from '@adonisjs/core/http'
import { pushTokenRepository } from '#infrastructure/repositories/push_token_repository'
import { registerPushTokenValidator, removePushTokenValidator } from '#modules/documents/validators/notification'
import { tenantContext } from '#modules/documents/domain/tenant_context'

export default class PushTokensController {
  async store({ request, auth, response }: HttpContext) {
    const payload = await request.validateUsing(registerPushTokenValidator)
    const tenantId = tenantContext.requireTenantId()

    const token = await pushTokenRepository.upsert({
      tenantId,
      userId: auth.user!.id,
      token: payload.token,
      platform: payload.platform ?? 'web',
    })

    return response.created({
      id: token.id,
      platform: token.platform,
    })
  }

  async destroy({ request, auth, response }: HttpContext) {
    const { token } = await request.validateUsing(removePushTokenValidator)
    await pushTokenRepository.deleteToken(auth.user!.id, token)
    return response.ok({ message: 'Push token removed' })
  }
}
