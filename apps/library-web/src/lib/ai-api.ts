import { apiClient } from '@/lib/api-client'
import type { ApiResponse } from '@/types/auth'
import type { AiChatResponse, AiConversation, AiMessage, AiQuickAction } from '@/types/ai'

export async function sendAiMessage(message: string, conversationId?: string) {
  const { data } = await apiClient.post<ApiResponse<AiChatResponse>>('/ai/chat', {
    message,
    conversationId,
  })
  return data.data
}

export async function fetchAiQuickActions() {
  const { data } = await apiClient.get<ApiResponse<AiQuickAction[]>>('/ai/quick-actions')
  return data.data
}

export async function fetchAiConversations() {
  const { data } = await apiClient.get<ApiResponse<AiConversation[]>>('/ai/conversations')
  return data.data
}

export async function fetchAiConversation(id: string) {
  const { data } = await apiClient.get<
    ApiResponse<{ id: string; title: string | null; messages: AiMessage[] }>
  >(`/ai/conversations/${id}`)
  return data.data
}

export async function deleteAiConversation(id: string) {
  await apiClient.delete(`/ai/conversations/${id}`)
}
