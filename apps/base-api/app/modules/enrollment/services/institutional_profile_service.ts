import Organization from '#modules/enrollment/models/organization'
import UsisInstitutionalProfile, {
  type InstitutionalSignatory,
} from '#modules/enrollment/models/usis_institutional_profile'
import { auditLogService } from '#modules/enrollment/services/audit_log_service'
import { AuditAction } from '#modules/enrollment/domain/enums/index'

export class InstitutionalProfileService {
  async getOrCreate(organizationId: string) {
    let row = await UsisInstitutionalProfile.query().where('organization_id', organizationId).first()
    if (!row) {
      const org = await Organization.findOrFail(organizationId)
      row = await UsisInstitutionalProfile.create({
        organizationId,
        legalName: org.name,
        displayName: org.name,
        logoUrl: null,
        signatories: [],
      })
    }
    return row
  }

  async update(input: {
    organizationId: string
    legalName: string
    displayName?: string | null
    logoUrl?: string | null
    signatories: InstitutionalSignatory[]
    actorUserId: string
  }) {
    const row = await this.getOrCreate(input.organizationId)
    row.legalName = input.legalName.trim()
    row.displayName = input.displayName?.trim() || null
    row.logoUrl = input.logoUrl?.trim() || null
    row.signatories = input.signatories
    await row.save()
    await auditLogService.log({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: AuditAction.UPDATE,
      entityType: 'institutional_profile',
      entityId: row.id,
    })
    return row
  }
}

export const institutionalProfileService = new InstitutionalProfileService()
