import { DateTime } from 'luxon'
import AiConversation from '#modules/library/models/ai_conversation'
import AiMessage from '#modules/library/models/ai_message'
import AuditService, { type AuditContext } from '#modules/library/services/audit/audit_service'
import type { AiContext, AiQuickAction } from '#modules/library/services/ai/ai_types'
import { getQuickActions } from '#modules/library/services/ai/assistant_context'
import LocalAgentProvider from '#modules/library/services/ai/local_agent'
import OpenAiProvider from '#modules/library/services/ai/openai_provider'
import { tenantContext } from '#modules/library/services/tenant/tenant_context'
import Tenant from '#modules/library/models/tenant'

const MAX_HISTORY = 20

export interface ChatInput {
  message: string
  conversationId?: string
}

export default class AssistantService {
  private openAi = new OpenAiProvider()
  private localAgent = new LocalAgentProvider()
  private auditService = new AuditService()

  async chat(input: ChatInput, ctx: AiContext, auditCtx?: AuditContext) {
    const conversation = input.conversationId
      ? await this.getConversation(input.conversationId, ctx.userId)
      : await AiConversation.create({
          tenantId: ctx.tenantId,
          userId: ctx.userId,
          title: input.message.slice(0, 80),
        })

    await AiMessage.create({
      conversationId: conversation.id,
      role: 'user',
      content: input.message,
    })

    const history = await this.loadHistory(conversation.id)

    let response
    if (this.openAi.isConfigured()) {
      try {
        response = await this.openAi.chat(ctx, history, input.message)
      } catch {
        response = await this.localAgent.chat(ctx, input.message)
      }
    } else {
      response = await this.localAgent.chat(ctx, input.message)
    }

    const assistantMessage = await AiMessage.create({
      conversationId: conversation.id,
      role: 'assistant',
      content: response.content,
      toolCalls:
        response.toolsUsed.length > 0
          ? response.toolsUsed.map((name) => ({ name, input: {} }))
          : null,
    })

    conversation.updatedAt = DateTime.now()
    if (!conversation.title) {
      conversation.title = input.message.slice(0, 80)
    }
    await conversation.save()

    await this.auditService.log(
      'create',
      'ai_conversation',
      conversation.id,
      null,
      {
        toolsUsed: response.toolsUsed,
        provider: response.provider,
        messageLength: input.message.length,
      },
      auditCtx
    )

    return {
      conversationId: conversation.id,
      message: {
        id: assistantMessage.id,
        role: 'assistant' as const,
        content: response.content,
        toolsUsed: response.toolsUsed,
        provider: response.provider,
        createdAt: assistantMessage.createdAt.toISO(),
      },
    }
  }

  async listConversations(userId: string) {
    const tenantId = tenantContext.get().id
    const rows = await AiConversation.query()
      .where('tenant_id', tenantId)
      .where('user_id', userId)
      .orderBy('updated_at', 'desc')
      .limit(30)

    return rows.map((c) => ({
      id: c.id,
      title: c.title,
      updatedAt: c.updatedAt?.toISO() ?? c.createdAt.toISO(),
      createdAt: c.createdAt.toISO(),
    }))
  }

  async getConversationDetail(conversationId: string, userId: string) {
    const conversation = await this.getConversation(conversationId, userId)
    const messages = await AiMessage.query()
      .where('conversation_id', conversation.id)
      .orderBy('created_at', 'asc')

    return {
      id: conversation.id,
      title: conversation.title,
      messages: messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        toolsUsed: m.toolCalls?.map((t) => t.name) ?? [],
        createdAt: m.createdAt.toISO(),
      })),
    }
  }

  async deleteConversation(conversationId: string, userId: string) {
    const conversation = await this.getConversation(conversationId, userId)
    await conversation.delete()
  }

  getQuickActions(ctx: AiContext): AiQuickAction[] {
    return getQuickActions(ctx)
  }

  async buildContext(user: {
    id: string
    email: string
    fullName: string
    permissions: string[]
    roles: string[]
  }): Promise<AiContext> {
    const tenant = tenantContext.get()
    const tenantRecord = await Tenant.findOrFail(tenant.id)

    return {
      tenantId: tenant.id,
      tenantName: tenantRecord.name,
      tenantSlug: tenant.slug,
      tenantType: tenantRecord.type,
      userId: user.id,
      userEmail: user.email,
      userName: user.fullName,
      permissions: user.permissions,
      roles: user.roles,
    }
  }

  private async getConversation(conversationId: string, userId: string) {
    return AiConversation.query()
      .where('id', conversationId)
      .where('tenant_id', tenantContext.get().id)
      .where('user_id', userId)
      .firstOrFail()
  }

  private async loadHistory(conversationId: string) {
    const messages = await AiMessage.query()
      .where('conversation_id', conversationId)
      .whereIn('role', ['user', 'assistant'])
      .orderBy('created_at', 'desc')
      .limit(MAX_HISTORY)

    return messages
      .reverse()
      .slice(0, -1)
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }))
  }
}
