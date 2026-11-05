export const COPILOT_ENTITY_TYPE = 'ai_assistant' as const

export enum CopilotIntent {
  GREETING = 'greeting',
  KNOWLEDGE_QUERY = 'knowledge_query',
  SEARCH = 'search',
  NAVIGATE = 'navigate',
  CREATE_DOCUMENT = 'create_document',
  UPDATE_DOCUMENT = 'update_document',
  APPROVE_DOCUMENT = 'approve_document',
  REJECT_DOCUMENT = 'reject_document',
  RETURN_DOCUMENT = 'return_document',
  SUMMARIZE_DOCUMENT = 'summarize_document',
  EXPLAIN_WORKFLOW = 'explain_workflow',
  GENERATE_REPORT = 'generate_report',
  OPEN_REFERENCE = 'open_reference',
  HELP = 'help',
  UNKNOWN = 'unknown',
}

export enum CopilotActionType {
  APPROVE = 'approve',
  REJECT = 'reject',
  RETURN = 'return',
  CREATE_DOCUMENT = 'create_document',
  UPDATE_DOCUMENT = 'update_document',
  ASSIGN_DOCUMENT = 'assign_document',
  NAVIGATE = 'navigate',
  TRIGGER_INTELLIGENCE = 'trigger_intelligence',
}

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
  role: 'user' | 'assistant' | 'system'
  content: string
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
  type: CopilotActionType
  label: string
  description: string
  confirmLabel: string
  cancelLabel: string
  payload: Record<string, unknown>
  requiredPermission?: string
}

export interface CopilotChatResponse {
  messageId: string
  content: string
  intent: CopilotIntent
  cards?: CopilotCard[]
  pendingAction?: CopilotPendingAction
  suggestions?: string[]
  sessionRefs?: CopilotSessionRef[]
}

export interface CopilotSessionRef {
  index: number
  type: 'document' | 'file' | 'user' | 'workflow'
  id: string
  label: string
  href?: string
}

export interface CopilotUserContext {
  userId: string
  tenantId: string
  fullName: string
  email: string
  roles: string[]
  permissions: string[]
  departmentName?: string | null
}

export interface CopilotConfirmResponse {
  success: boolean
  message: string
  cards?: CopilotCard[]
  href?: string
}
