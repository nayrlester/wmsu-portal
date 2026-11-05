import { apiClient } from '@/api/client'
import { apiRequest } from '@/api/utils/request'
import type {
  CopilotChatRequest,
  CopilotChatResponse,
  CopilotConfirmResponse,
} from '@/features/copilot/types/copilot.types'

export const copilotApi = {
  chat: (data: CopilotChatRequest): Promise<CopilotChatResponse> =>
    apiRequest(apiClient.post<CopilotChatResponse>('/account/copilot/chat', data)),

  confirm: (actionId: string): Promise<CopilotConfirmResponse> =>
    apiRequest(apiClient.post<CopilotConfirmResponse>('/account/copilot/confirm', { actionId })),

  cancel: (actionId: string): Promise<{ cancelled: boolean }> =>
    apiRequest(apiClient.post<{ cancelled: boolean }>('/account/copilot/cancel', { actionId })),
}
