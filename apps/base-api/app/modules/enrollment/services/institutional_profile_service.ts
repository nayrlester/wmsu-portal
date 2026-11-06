import app from '@adonisjs/core/services/app'
import type { MultipartFile } from '@adonisjs/core/bodyparser'
import { randomUUID } from 'node:crypto'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import Organization from '#modules/enrollment/models/organization'
import UsisInstitutionalProfile, {
  type InstitutionalSignatory,
} from '#modules/enrollment/models/usis_institutional_profile'
import { auditLogService } from '#modules/enrollment/services/audit_log_service'
import { AuditAction } from '#modules/enrollment/domain/enums/index'

const LOGO_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp'])
const MAX_LOGO_BYTES = 2 * 1024 * 1024

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

  async storeLogo(organizationId: string, file: MultipartFile, actorUserId: string) {
    if (!file.isValid) {
      throw new Error(file.errors.map((error) => error.message).join(', ') || 'Logo file is invalid')
    }
    const mime =
      file.type && file.subtype && !String(file.type).includes('/')
        ? `${file.type}/${file.subtype}`
        : (file.type ?? '')
    if (!LOGO_TYPES.has(mime) && mime !== 'image/jpg') {
      throw new Error('Logo must be a PNG, JPEG, or WebP image')
    }
    if ((file.size ?? 0) > MAX_LOGO_BYTES) {
      throw new Error('Logo must be 2 MB or smaller')
    }

    const ext = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg'
    const filename = `logo-${randomUUID()}.${ext}`
    const directory = join(app.makePath('storage/enrollment-logos'), organizationId)
    await mkdir(directory, { recursive: true })
    await file.move(directory, { name: filename, overwrite: true })

    const row = await this.getOrCreate(organizationId)
    row.logoUrl = `/api/v1/enrollment/public/institution-logos/${organizationId}/${filename}`
    await row.save()
    await auditLogService.log({
      organizationId,
      actorUserId,
      action: AuditAction.UPDATE,
      entityType: 'institutional_profile',
      entityId: row.id,
      metadata: { asset: 'logo' },
    })
    return row
  }
}

export const institutionalProfileService = new InstitutionalProfileService()
