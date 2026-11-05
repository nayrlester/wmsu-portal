import type { HttpContext } from '@adonisjs/core/http'
import { copilotService } from '#modules/documents/services/copilot_service'
import { copilotActionService } from '#modules/documents/services/copilot_action_service'
import {
  copilotCancelValidator,
  copilotChatValidator,
  copilotConfirmValidator,
} from '#modules/documents/validators/copilot'

export default class CopilotController {
  async chat({ request, auth, response }: HttpContext) {
    const payload = await request.validateUsing(copilotChatValidator)
    const user = auth.user!
    const tenantId = user.tenantId!

    const result = await copilotService.chat({
      message: payload.message,
      user,
      tenantId,
      pageContext: payload.pageContext,
      history: payload.history,
      sessionRefs: payload.sessionRefs,
      ipAddress: request.ip(),
      userAgent: request.header('user-agent'),
    })

    return response.ok(result)
  }

  async confirm({ request, auth, response }: HttpContext) {
    const { actionId } = await request.validateUsing(copilotConfirmValidator)
    const user = auth.user!
    const tenantId = user.tenantId!

    const userContext = await copilotActionService.buildUserContext(user, tenantId)
    const result = await copilotActionService.confirmAction(
      actionId,
      userContext,
      request.ip(),
      request.header('user-agent')
    )

    if (!result.success) {
      return response.badRequest(result)
    }

    return response.ok(result)
  }

  async cancel({ request, auth, response }: HttpContext) {
    const { actionId } = await request.validateUsing(copilotCancelValidator)
    const user = auth.user!

    const cancelled = copilotActionService.cancelPendingAction(actionId, user.id, user.tenantId!)

    return response.ok({ cancelled })
  }
}
