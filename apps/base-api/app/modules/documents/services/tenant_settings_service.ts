import TenantSetting from '#modules/documents/models/tenant_setting'
import { tenantContext } from '#modules/documents/domain/tenant_context'
import { auditService } from '#modules/documents/services/audit_service'
import { AuditAction } from '#modules/documents/domain/enums/index'

export interface UpdateTenantSettingsDto {
  timezone?: string
  locale?: string
  dateFormat?: string
  trackingPrefix?: string
  notificationPreferences?: Record<string, unknown>
  featureFlags?: Record<string, unknown>
}

export class TenantSettingsService {
  async get(): Promise<TenantSetting> {
    const tenantId = tenantContext.requireTenantId()
    return TenantSetting.query().where('tenant_id', tenantId).firstOrFail()
  }

  async update(dto: UpdateTenantSettingsDto, userId: string): Promise<TenantSetting> {
    const settings = await this.get()

    if (dto.timezone !== undefined) settings.timezone = dto.timezone
    if (dto.locale !== undefined) settings.locale = dto.locale
    if (dto.dateFormat !== undefined) settings.dateFormat = dto.dateFormat
    if (dto.trackingPrefix !== undefined) settings.trackingPrefix = dto.trackingPrefix.toUpperCase()
    if (dto.notificationPreferences !== undefined) {
      settings.notificationPreferences = dto.notificationPreferences
    }
    if (dto.featureFlags !== undefined) settings.featureFlags = dto.featureFlags

    await settings.save()

    await auditService.log({
      tenantId: settings.tenantId,
      userId,
      action: AuditAction.UPDATE,
      entityType: 'tenant_settings',
      entityId: settings.id,
      newValues: dto as Record<string, unknown>,
    })

    return settings
  }

  serialize(settings: TenantSetting) {
    return {
      id: settings.id,
      timezone: settings.timezone,
      locale: settings.locale,
      dateFormat: settings.dateFormat,
      trackingPrefix: settings.trackingPrefix,
      notificationPreferences: settings.notificationPreferences,
      featureFlags: settings.featureFlags,
      updatedAt: settings.updatedAt,
    }
  }
}

export const tenantSettingsService = new TenantSettingsService()
