import type { HttpContext } from '@adonisjs/core/http'
import AssistantService from '#modules/library/services/ai/assistant_service'
import RbacService from '#modules/library/services/auth/rbac_service'
import ForbiddenException from '#modules/library/exceptions/forbidden_exception'
import { aiChatValidator } from '#modules/library/validators/ai'

function auditFromCtx(ctx: HttpContext) {
  return {
    userId: ctx.authUser?.id,
    userEmail: ctx.authUser?.email,
    ipAddress: ctx.request.ip(),
    requestId: ctx.request.header('x-request-id') ?? undefined,
  }
}

export default class AiController {
  private assistantService = new AssistantService()
  private rbac = new RbacService()

  private ensure(ctx: HttpContext) {
    if (!ctx.authUser || !this.rbac.hasPermission(ctx.authUser.permissions, 'ai:query')) {
      throw new ForbiddenException('Missing permission: ai:query')
    }
  }

  async chat(ctx: HttpContext) {
    this.ensure(ctx)
    const payload = await ctx.request.validateUsing(aiChatValidator)
    const aiCtx = await this.assistantService.buildContext(ctx.authUser!)

    const result = await this.assistantService.chat(payload, aiCtx, auditFromCtx(ctx))

    return ctx.response.ok({
      success: true,
      data: result,
    })
  }

  async quickActions(ctx: HttpContext) {
    this.ensure(ctx)
    const aiCtx = await this.assistantService.buildContext(ctx.authUser!)
    const actions = this.assistantService.getQuickActions(aiCtx)

    return ctx.response.ok({ success: true, data: actions })
  }

  async conversations(ctx: HttpContext) {
    this.ensure(ctx)
    const items = await this.assistantService.listConversations(ctx.authUser!.id)

    return ctx.response.ok({ success: true, data: items })
  }

  async showConversation(ctx: HttpContext) {
    this.ensure(ctx)
    const detail = await this.assistantService.getConversationDetail(
      ctx.params.id,
      ctx.authUser!.id
    )

    return ctx.response.ok({ success: true, data: detail })
  }

  async destroyConversation(ctx: HttpContext) {
    this.ensure(ctx)
    await this.assistantService.deleteConversation(ctx.params.id, ctx.authUser!.id)

    return ctx.response.ok({ success: true, message: 'Conversation deleted' })
  }
}
