import type { MultipartFile } from '@adonisjs/core/bodyparser'
import TenantBranding from '#modules/documents/models/tenant_branding'
import TenantDomain from '#modules/documents/models/tenant_domain'
import { tenantContext } from '#modules/documents/domain/tenant_context'
import { auditService } from '#modules/documents/services/audit_service'
import { fileStorageService } from '#modules/documents/services/file_storage_service'
import { AuditAction } from '#modules/documents/domain/enums/index'

export interface UpdateTenantBrandingDto {
  primaryColor?: string
  secondaryColor?: string
  faviconUrl?: string | null
  loginBackgroundUrl?: string | null
  customCss?: Record<string, unknown> | null
}

export class TenantBrandingService {
  async get(): Promise<TenantBranding> {
    const tenantId = tenantContext.requireTenantId()
    return TenantBranding.query().where('tenant_id', tenantId).firstOrFail()
  }

  async getPublicByDomain(domain: string) {
    const domainRecord = await TenantDomain.query()
      .where('domain', domain.toLowerCase())
      .where('is_verified', true)
      .preload('tenant', (q) => q.whereNull('deleted_at').where('status', 'active').preload('branding'))
      .first()

    if (!domainRecord?.tenant?.branding) return null

    const branding = domainRecord.tenant.branding
    branding.tenant = domainRecord.tenant
    return this.serializePublic(branding)
  }

  async update(dto: UpdateTenantBrandingDto, userId: string): Promise<TenantBranding> {
    const branding = await this.get()

    if (dto.primaryColor !== undefined) branding.primaryColor = dto.primaryColor
    if (dto.secondaryColor !== undefined) branding.secondaryColor = dto.secondaryColor
    if (dto.faviconUrl !== undefined) branding.faviconUrl = dto.faviconUrl
    if (dto.loginBackgroundUrl !== undefined) branding.loginBackgroundUrl = dto.loginBackgroundUrl
    if (dto.customCss !== undefined) branding.customCss = dto.customCss

    await branding.save()

    await auditService.log({
      tenantId: branding.tenantId,
      userId,
      action: AuditAction.UPDATE,
      entityType: 'tenant_branding',
      entityId: branding.id,
      newValues: dto as Record<string, unknown>,
    })

    return branding
  }

  async uploadLogo(file: MultipartFile, userId: string): Promise<TenantBranding> {
    return this.uploadLogoDirect(file, userId)
  }

  async uploadLogoDirect(file: MultipartFile, userId: string): Promise<TenantBranding> {
    const tenantId = tenantContext.requireTenantId()
    const branding = await this.get()
    const logoUrl = await fileStorageService.storeTenantLogo(tenantId, file)
    branding.logoUrl = logoUrl
    await branding.save()

    await auditService.log({
      tenantId,
      userId,
      action: AuditAction.UPLOAD,
      entityType: 'tenant_branding',
      entityId: branding.id,
      metadata: { asset: 'logo' },
    })

    return branding
  }

  serialize(branding: TenantBranding) {
    return {
      id: branding.id,
      logoUrl: branding.logoUrl,
      faviconUrl: branding.faviconUrl,
      primaryColor: branding.primaryColor,
      secondaryColor: branding.secondaryColor,
      loginBackgroundUrl: branding.loginBackgroundUrl,
      customCss: branding.customCss,
      updatedAt: branding.updatedAt,
    }
  }

  serializePublic(branding: TenantBranding & { tenant?: { name: string } }) {
    return {
      organizationName: branding.tenant?.name,
      logoUrl: branding.logoUrl,
      faviconUrl: branding.faviconUrl,
      primaryColor: branding.primaryColor,
      secondaryColor: branding.secondaryColor,
      loginBackgroundUrl: branding.loginBackgroundUrl,
    }
  }
}

export const tenantBrandingService = new TenantBrandingService()
