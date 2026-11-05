export type CopilotPanelMode = 'minimized' | 'panel' | 'fullscreen'

export type CopilotCardType =
  | 'search_result'
  | 'analytics'
  | 'document'
  | 'workflow'
  | 'activity'
  | 'navigation'

export interface CopilotPageContext {
  pathname?: string
  documentId?: string
  documentTitle?: string
  documentStatus?: string
  trackingNumber?: string
}

export interface CopilotMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  cards?: CopilotCard[]
  pendingAction?: CopilotPendingAction
  suggestions?: string[]
  isThinking?: boolean
}

export interface CopilotCard {
  id: string
  type: CopilotCardType
  title: string
  subtitle?: string
  description?: string
  href?: string
  metadata?: Record<string, unknown>
}

export interface CopilotPendingAction {
  id: string
  type: string
  label: string
  description: string
  confirmLabel: string
  cancelLabel: string
  payload: Record<string, unknown>
  requiredPermission?: string
}

export interface CopilotSessionRef {
  index: number
  type: 'document' | 'file' | 'user' | 'workflow'
  id: string
  label: string
  href?: string
}

export interface CopilotChatRequest {
  message: string
  pageContext?: CopilotPageContext
  history?: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>
  sessionRefs?: CopilotSessionRef[]
}

export interface CopilotChatResponse {
  messageId: string
  content: string
  intent: string
  cards?: CopilotCard[]
  pendingAction?: CopilotPendingAction
  suggestions?: string[]
  sessionRefs?: CopilotSessionRef[]
}

export interface CopilotConfirmResponse {
  success: boolean
  message: string
  cards?: CopilotCard[]
  href?: string
}

export interface CopilotActivityEvent {
  id: string
  type: 'notification' | 'approval' | 'document'
  title: string
  message: string
  timestamp: string
  href?: string
}

export interface CopilotQuickAction {
  id: string
  label: string
  prompt: string
  permission?: string
}
