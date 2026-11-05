import { DateTime } from 'luxon'
import AuditLog from '#modules/documents/models/audit_log'
import { AuditAction } from '#modules/documents/domain/enums/index'
import { computeAuditEntryHash } from '#modules/documents/domain/audit/audit_hash_chain'
import db from '@adonisjs/lucid/services/db'

export interface AuditLogPayload {
  tenantId?: string | null
  userId?: string | null
  action: AuditAction | string
  entityType: string
  entityId?: string | null
  ipAddress?: string | null
  userAgent?: string | null
  oldValues?: Record<string, unknown> | null
  newValues?: Record<string, unknown> | null
  metadata?: Record<string, unknown> | null
}

export class AuditService {
  async log(payload: AuditLogPayload): Promise<AuditLog> {
    return db.transaction(async (trx) => {
      const createdAt = DateTime.now()
      const tenantId = payload.tenantId ?? null

      const previous = await AuditLog.query({ client: trx })
        .if(tenantId, (q) => q.where('tenant_id', tenantId!))
        .if(!tenantId, (q) => q.whereNull('tenant_id'))
        .whereNotNull('entry_hash')
        .orderBy('created_at', 'desc')
        .orderBy('id', 'desc')
        .first()

      const prevHash = previous?.entryHash ?? null
      const entryHash = computeAuditEntryHash(prevHash, {
        tenantId,
        userId: payload.userId ?? null,
        action: payload.action,
        entityType: payload.entityType,
        entityId: payload.entityId ?? null,
        oldValues: payload.oldValues ?? null,
        newValues: payload.newValues ?? null,
        metadata: payload.metadata ?? null,
        createdAtIso: createdAt.toISO()!,
      })

      return AuditLog.create(
        {
          tenantId,
          userId: payload.userId ?? null,
          action: payload.action,
          entityType: payload.entityType,
          entityId: payload.entityId ?? null,
          ipAddress: payload.ipAddress ?? null,
          userAgent: payload.userAgent ?? null,
          oldValues: payload.oldValues ?? null,
          newValues: payload.newValues ?? null,
          metadata: payload.metadata ?? null,
          prevHash,
          entryHash,
          createdAt,
        },
        { client: trx }
      )
    })
  }

  /** Verify append-only hash chain for a tenant (or global when tenantId null). */
  async verifyChain(tenantId: string | null, limit = 500): Promise<{
    ok: boolean
    checked: number
    brokenAtId: string | null
  }> {
    const rows = await AuditLog.query()
      .if(tenantId, (q) => q.where('tenant_id', tenantId!))
      .if(!tenantId, (q) => q.whereNull('tenant_id'))
      .whereNotNull('entry_hash')
      .orderBy('created_at', 'asc')
      .orderBy('id', 'asc')
      .limit(limit)

    let expectedPrev: string | null = null
    for (const row of rows) {
      if ((row.prevHash ?? null) !== expectedPrev) {
        return { ok: false, checked: rows.length, brokenAtId: row.id }
      }
      const recomputed = computeAuditEntryHash(row.prevHash ?? null, {
        tenantId: row.tenantId,
        userId: row.userId,
        action: row.action,
        entityType: row.entityType,
        entityId: row.entityId,
        oldValues: row.oldValues,
        newValues: row.newValues,
        metadata: row.metadata,
        createdAtIso: row.createdAt.toISO()!,
      })
      if (recomputed !== row.entryHash) {
        return { ok: false, checked: rows.length, brokenAtId: row.id }
      }
      expectedPrev = row.entryHash
    }

    return { ok: true, checked: rows.length, brokenAtId: null }
  }
}

export const auditService = new AuditService()
