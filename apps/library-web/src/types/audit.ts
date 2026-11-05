export interface AuditLogEntry {
  id: string
  userId: string | null
  userEmail: string | null
  action: string
  resourceType: string
  resourceId: string | null
  oldValues: Record<string, unknown> | null
  newValues: Record<string, unknown> | null
  ipAddress: string | null
  requestId: string | null
  createdAt: string
}
