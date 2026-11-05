import AuditLog, { type AuditAction } from '#modules/library/models/audit_log'
import { tenantContext } from '#modules/library/services/tenant/tenant_context'

export interface AuditContext {
  userId?: string
  userEmail?: string
  ipAddress?: string
  requestId?: string
}

export interface AuditListFilters {
  action?: AuditAction
  resourceType?: string
  userId?: string
  from?: string
  to?: string
  page?: number
  perPage?: number
}

function stripSecrets(values: Record<string, unknown> | null) {
  if (!values) return null
  const clone = { ...values }
  for (const key of Object.keys(clone)) {
    if (/password|token|secret|authorization|api[_-]?key/i.test(key)) {
      clone[key] = '[redacted]'
    }
  }
  return clone
}

export default class AuditService {
  async log(
    action: AuditAction,
    resourceType: string,
    resourceId: string | null,
    oldValues: Record<string, unknown> | null,
    newValues: Record<string, unknown> | null,
    ctx?: AuditContext
  ): Promise<void> {
    const tenant = tenantContext.tryGet()

    await AuditLog.create({
      tenantId: tenant?.id ?? null,
      userId: ctx?.userId ?? null,
      userEmail: ctx?.userEmail ?? null,
      action,
      resourceType,
      resourceId,
      oldValues: stripSecrets(oldValues),
      newValues: stripSecrets(newValues),
      ipAddress: ctx?.ipAddress ?? null,
      requestId: ctx?.requestId ?? null,
    })
  }

  async list(filters: AuditListFilters) {
    const tid = tenantContext.get().id
    const page = filters.page ?? 1
    const perPage = Math.min(filters.perPage ?? 25, 100)

    const query = AuditLog.query().where('tenant_id', tid)

    if (filters.action) query.where('action', filters.action)
    if (filters.resourceType) query.where('resource_type', filters.resourceType)
    if (filters.userId) query.where('user_id', filters.userId)
    if (filters.from) query.where('created_at', '>=', filters.from)
    if (filters.to) query.where('created_at', '<=', filters.to)

    return query.orderBy('created_at', 'desc').paginate(page, perPage)
  }
}
