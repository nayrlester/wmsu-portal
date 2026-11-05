import db from '@adonisjs/lucid/services/db'
import { t } from '#modules/records/helpers/db_schema'
import { auditLogService } from '#modules/records/services/audit_log_service'

export class DocumentRequestLookupService {
  async findByReference(organizationId: string, requestNumber: string, actorUserId?: string | null) {
    const tor = await db
      .from(t('tor_requests'))
      .where({ organization_id: organizationId, request_number: requestNumber })
      .first()

    if (tor) {
      await auditLogService.log({
        organizationId,
        actorUserId: actorUserId ?? null,
        action: 'torms.request.lookup',
        entityType: 'tor_request',
        entityId: tor.id,
        metadata: { requestNumber, requestKind: 'tor' },
      })
      return { requestKind: 'tor' as const, request: tor }
    }

    const cert = await db
      .from(t('certification_requests'))
      .where({ organization_id: organizationId, request_number: requestNumber })
      .first()

    if (cert) {
      await auditLogService.log({
        organizationId,
        actorUserId: actorUserId ?? null,
        action: 'torms.request.lookup',
        entityType: 'certification_request',
        entityId: cert.id,
        metadata: { requestNumber, requestKind: 'certification' },
      })
      return { requestKind: 'certification' as const, request: cert }
    }

    return null
  }
}

export const documentRequestLookupService = new DocumentRequestLookupService()
