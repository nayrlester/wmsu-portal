import { DateTime } from 'luxon'
import AuditLog from '#modules/enrollment/models/audit_log'
import db from '@adonisjs/lucid/services/db'
import { t } from '#modules/enrollment/helpers/db_schema'
import { randomUUID } from 'node:crypto'
import type { SssOffice } from '#modules/enrollment/domain/student_support'

/**
 * General audit never stores counseling/clinical note bodies.
 * Sensitive reads are recorded in sss_sensitive_access_logs only.
 */
export class SssPrivacyService {
  async logOperational(input: {
    organizationId: string
    actorUserId?: string | null
    action: string
    entityType: string
    entityId?: string | null
    metadata?: Record<string, unknown> | null
  }) {
    const safe = { ...(input.metadata ?? {}) }
    delete safe.noteBody
    delete safe.note_body
    delete safe.diagnosis
    delete safe.clinicalNotes
    delete safe.caseNotes
    await AuditLog.create({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      metadata: Object.keys(safe).length ? safe : null,
    })
  }

  async logSensitiveAccess(input: {
    organizationId: string
    actorUserId: string
    office: SssOffice
    entityType: string
    entityId: string
    studentId?: string | null
    accessType?: string
    purpose?: string | null
  }) {
    await db.table(t('sss_sensitive_access_logs')).insert({
      id: randomUUID(),
      organization_id: input.organizationId,
      actor_user_id: input.actorUserId,
      office: input.office,
      entity_type: input.entityType,
      entity_id: input.entityId,
      student_id: input.studentId ?? null,
      access_type: input.accessType ?? 'read',
      purpose: input.purpose ?? null,
      accessed_at: DateTime.now().toSQL(),
      created_at: DateTime.now().toSQL(),
    })
  }

  async enqueueNotification(input: {
    organizationId: string
    studentId?: string | null
    userId?: string | null
    channel?: string
    templateCode: string
    subject?: string | null
    payload?: Record<string, unknown> | null
  }) {
    await db.table(t('sss_notifications_outbox')).insert({
      id: randomUUID(),
      organization_id: input.organizationId,
      student_id: input.studentId ?? null,
      user_id: input.userId ?? null,
      channel: input.channel ?? 'portal',
      template_code: input.templateCode,
      subject: input.subject ?? null,
      status: 'pending',
      payload: input.payload ? JSON.stringify(input.payload) : null,
      scheduled_at: DateTime.now().toSQL(),
      sent_at: null,
      created_at: DateTime.now().toSQL(),
      updated_at: null,
    })
  }
}

export const sssPrivacy = new SssPrivacyService()
