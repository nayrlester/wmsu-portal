export interface AiMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  toolsUsed?: string[]
  provider?: 'openai' | 'local'
  createdAt?: string
}

export interface AiConversation {
  id: string
  title: string | null
  updatedAt: string
  createdAt: string
}

export interface AiQuickAction {
  id: string
  label: string
  prompt: string
  icon: string
}

export interface AiChatResponse {
  conversationId: string
  message: AiMessage
}
