export interface AiContext {
  tenantId: string
  tenantName: string
  tenantSlug: string
  tenantType: string
  userId: string
  userEmail: string
  userName: string
  permissions: string[]
  roles: string[]
}

export interface AiChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface AiAssistantResponse {
  content: string
  toolsUsed: string[]
  provider: 'openai' | 'local'
}

export interface AiQuickAction {
  id: string
  label: string
  prompt: string
  icon: string
}
