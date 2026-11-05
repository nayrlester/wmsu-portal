import env from '#start/env'
import type { AiChatMessage, AiContext, AiAssistantResponse } from '#modules/library/services/ai/ai_types'
import AiToolExecutor, { getAvailableTools } from '#modules/library/services/ai/ai_tools'
import { buildSystemPrompt } from '#modules/library/services/ai/assistant_context'

interface OpenAiToolCall {
  id: string
  type: 'function'
  function: { name: string; arguments: string }
}

export default class OpenAiProvider {
  private apiKey = env.get('OPENAI_API_KEY', '')
  private model = env.get('AI_MODEL', 'gpt-4o-mini')

  isConfigured(): boolean {
    return Boolean(this.apiKey)
  }

  async chat(
    ctx: AiContext,
    history: AiChatMessage[],
    userMessage: string
  ): Promise<AiAssistantResponse> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured')
    }

    const availableTools = getAvailableTools(ctx)
    const systemPrompt = buildSystemPrompt(
      ctx,
      availableTools.map((t) => t.name)
    )

    const messages: unknown[] = [
      { role: 'system', content: systemPrompt },
      ...history.filter((m) => m.role !== 'system'),
      { role: 'user', content: userMessage },
    ]

    const tools = availableTools.map((tool) => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }))

    const executor = new AiToolExecutor()
    const toolsUsed: string[] = []

    let response = await this.callOpenAi(messages, tools)
    let assistantMessage = response.choices[0]?.message

    for (let round = 0; round < 3 && assistantMessage?.tool_calls?.length; round++) {
      messages.push({
        role: 'assistant',
        content: assistantMessage.content ?? '',
        tool_calls: assistantMessage.tool_calls,
      })

      for (const call of assistantMessage.tool_calls as OpenAiToolCall[]) {
        const args = JSON.parse(call.function.arguments || '{}') as Record<string, unknown>
        toolsUsed.push(call.function.name)

        let result: unknown
        try {
          result = await executor.execute(
            { name: call.function.name, arguments: args },
            ctx
          )
        } catch (error) {
          result = { error: error instanceof Error ? error.message : 'Tool failed' }
        }

        messages.push({
          role: 'tool',
          tool_call_id: call.id,
          content: JSON.stringify(result),
        })
      }

      response = await this.callOpenAi(messages, tools)
      assistantMessage = response.choices[0]?.message
    }

    return {
      content: assistantMessage?.content?.trim() || 'I could not generate a response.',
      toolsUsed: [...new Set(toolsUsed)],
      provider: 'openai',
    }
  }

  private async callOpenAi(messages: unknown[], tools: unknown[]) {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        tools: tools.length ? tools : undefined,
        tool_choice: tools.length ? 'auto' : undefined,
        temperature: 0.3,
        max_tokens: 800,
      }),
    })

    if (!res.ok) {
      const body = await res.text()
      throw new Error(`OpenAI API error: ${res.status} ${body}`)
    }

    return res.json() as Promise<{
      choices: Array<{ message: { content?: string; tool_calls?: OpenAiToolCall[] } }>
    }>
  }
}
