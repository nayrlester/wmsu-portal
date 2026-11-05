import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  deleteAiConversation,
  fetchAiConversation,
  fetchAiConversations,
  fetchAiQuickActions,
  sendAiMessage,
} from '@/lib/ai-api'

export function useAiQuickActions(enabled: boolean) {
  return useQuery({
    queryKey: ['ai', 'quick-actions'],
    queryFn: fetchAiQuickActions,
    enabled,
  })
}

export function useAiConversations(enabled: boolean) {
  return useQuery({
    queryKey: ['ai', 'conversations'],
    queryFn: fetchAiConversations,
    enabled,
  })
}

export function useAiConversation(id: string | null) {
  return useQuery({
    queryKey: ['ai', 'conversation', id],
    queryFn: () => fetchAiConversation(id!),
    enabled: Boolean(id),
  })
}

export function useAiChat() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ message, conversationId }: { message: string; conversationId?: string }) =>
      sendAiMessage(message, conversationId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ai', 'conversations'] })
    },
  })
}

export function useDeleteAiConversation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteAiConversation,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ai', 'conversations'] }),
  })
}
