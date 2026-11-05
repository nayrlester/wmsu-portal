import { ApprovalAction } from '#modules/documents/domain/enums/index'

export interface RoutingRecordInput {
  tenantId: string
  documentId: string
  action: ApprovalAction | string
  fromUserId?: string | null
  toUserId?: string | null
  fromDepartmentId?: string | null
  toDepartmentId?: string | null
  remarks?: string | null
  stepNodeId?: string | null
  workflowInstanceId?: string | null
  metadata?: Record<string, unknown> | null
}

export interface DocumentActionEventPayload {
  tenantId: string
  documentId: string
  action: ApprovalAction | string
  actorUserId: string
  fromUserId?: string | null
  toUserId?: string | null
  remarks?: string | null
  stepNodeId?: string | null
  workflowInstanceId?: string | null
  metadata?: Record<string, unknown> | null
}

export type ActivityFeedItemType = 'routing' | 'approval' | 'audit'

export interface ActivityFeedItem {
  id: string
  type: ActivityFeedItemType
  action: string
  occurredAt: string
  fromUser: { id: string; fullName: string | null; email: string } | null
  toUser: { id: string; fullName: string | null; email: string } | null
  remarks: string | null
  stepNodeId?: string | null
  metadata?: Record<string, unknown> | null
}

export interface TimelineEntry {
  id: string
  action: string
  remarks: string | null
  routedAt: string
  fromUser: { id: string; fullName: string | null; email: string } | null
  toUser: { id: string; fullName: string | null; email: string } | null
  fromDepartment: { id: string; name: string } | null
  toDepartment: { id: string; name: string } | null
}

export interface ApprovalHistoryEntry {
  id: string
  action: string
  comments: string | null
  stepNodeId: string | null
  actedAt: string
  approver: { id: string; fullName: string | null; email: string } | null
  workflowInstanceId: string | null
}
