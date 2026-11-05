import db from '@adonisjs/lucid/services/db'
import { t } from '#modules/records/helpers/db_schema'
import { auditLogService } from '#modules/records/services/audit_log_service'
import {
  TOR_CERTIFICATION_TYPES,
  isCertificationTypeCode,
  getCertificationTypeDef,
} from '#modules/records/domain/torms/certification_types'

function httpError(message: string, status: number) {
  const err = new Error(message) as Error & { status: number }
  err.status = status
  return err
}

export class CertificationTypeService {
  async ensureDefaults(organizationId: string) {
    const now = new Date()
    for (const def of TOR_CERTIFICATION_TYPES) {
      const existing = await db
        .from(t('certification_type_configs'))
        .where({ organization_id: organizationId, code: def.code })
        .first()
      if (existing) continue
      await db.table(t('certification_type_configs')).insert({
        organization_id: organizationId,
        code: def.code,
        official_name: def.officialName,
        description: def.description,
        active: true,
        international_capable: def.internationalCapable,
        academic_focus: def.academicFocus,
        required_info_json: [],
        processing_notes: null,
        template_ref: null,
        updated_by: null,
        created_at: now,
        updated_at: now,
      })
    }
  }

  async list(organizationId: string, activeOnly = false) {
    await this.ensureDefaults(organizationId)
    const q = db
      .from(t('certification_type_configs'))
      .where('organization_id', organizationId)
      .orderBy('official_name', 'asc')
    if (activeOnly) q.andWhere('active', true)
    return q
  }

  async getActive(organizationId: string, code: string) {
    if (!isCertificationTypeCode(code)) {
      throw httpError(
        `Unknown certification type. Allowed TOR-named types: ${TOR_CERTIFICATION_TYPES.map((x) => x.code).join(', ')}`,
        422
      )
    }
    await this.ensureDefaults(organizationId)
    const row = await db
      .from(t('certification_type_configs'))
      .where({ organization_id: organizationId, code })
      .first()
    if (!row || !row.active) {
      throw httpError(`Certification type ${code} is inactive or unavailable`, 422)
    }
    return row
  }

  async update(
    organizationId: string,
    code: string,
    input: {
      actorUserId: string
      active?: boolean
      description?: string | null
      processingNotes?: string | null
    }
  ) {
    if (!isCertificationTypeCode(code)) {
      throw httpError('Cannot configure certification types outside the TOR-named catalog (FC #8)', 422)
    }
    await this.ensureDefaults(organizationId)
    const existing = await db
      .from(t('certification_type_configs'))
      .where({ organization_id: organizationId, code })
      .first()
    if (!existing) throw httpError('Certification type config not found', 404)

    if (input.active === false) {
      const inUse = await db
        .from(t('certification_requests'))
        .where({
          organization_id: organizationId,
          certification_type: code,
        })
        .whereIn('status', ['pending', 'processing', 'approved'])
        .first()
      if (inUse) {
        throw httpError(
          'Cannot deactivate a certification type that has open requests. Close or complete them first.',
          409
        )
      }
    }

    const now = new Date()
    const [updated] = await db
      .from(t('certification_type_configs'))
      .where('id', existing.id)
      .update({
        active: input.active === undefined ? existing.active : input.active,
        description:
          input.description === undefined ? existing.description : input.description,
        processing_notes:
          input.processingNotes === undefined
            ? existing.processing_notes
            : input.processingNotes,
        updated_by: input.actorUserId,
        updated_at: now,
      })
      .returning('*')

    await auditLogService.log({
      organizationId,
      actorUserId: input.actorUserId,
      action: 'torms.cert_type.updated',
      entityType: 'certification_type_config',
      entityId: updated.id,
      metadata: {
        code,
        active: updated.active,
        torDef: getCertificationTypeDef(code)?.officialName ?? null,
      },
    })

    return updated
  }
}

export const certificationTypeService = new CertificationTypeService()
