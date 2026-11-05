import type { HttpContext } from '@adonisjs/core/http'
import { mfaCodeValidator } from '#modules/documents/validators/auth'
import { mfaService } from '#modules/documents/services/mfa_service'

export default class MfaController {
  async setup({ auth, response }: HttpContext) {
    const user = auth.user!
    const result = await mfaService.setup(user)

    return response.ok({
      secret: result.secret,
      qrCodeDataUrl: result.qrCodeDataUrl,
      message: 'Scan QR code with your authenticator app, then confirm with a code.',
    })
  }

  async enable({ auth, request, response }: HttpContext) {
    const user = auth.user!
    const { code } = await request.validateUsing(mfaCodeValidator)

    try {
      await mfaService.enable(user, code)
      return response.ok({ message: 'MFA enabled successfully', mfaEnabled: true })
    } catch {
      return response.badRequest({ error: 'Invalid MFA code' })
    }
  }

  async disable({ auth, request, response }: HttpContext) {
    const user = auth.user!
    const { code } = await request.validateUsing(mfaCodeValidator)

    try {
      await mfaService.disable(user, code)
      return response.ok({ message: 'MFA disabled successfully', mfaEnabled: false })
    } catch {
      return response.badRequest({ error: 'Invalid MFA code' })
    }
  }

  async status({ auth, response }: HttpContext) {
    const user = auth.user!
    return response.ok({ mfaEnabled: user.mfaEnabled })
  }
}
