import { DateTime } from 'luxon'
import Tenant from '#modules/documents/models/tenant'
import User from '#modules/documents/models/user'
import { tenantContext } from '#modules/documents/domain/tenant_context'
import { auditService } from '#modules/documents/services/audit_service'
import { tenantOnboardingService } from '#modules/documents/services/tenant_onboarding_service'
import { TenantNotFoundException } from '#modules/documents/domain/exceptions/tenant_exceptions'
import { AuditAction, PlanSlug, TenantStatus } from '#modules/documents/domain/enums/index'

export interface CreateTenantDto {
  name: string
  slug?: string
  planSlug?: PlanSlug
  ownerEmail?: string
  ownerFullName?: string
  ownerPassword?: string
}

export interface UpdateTenantDto {
  name?: string
  slug?: string
  planTier?: string
}

export class TenantService {
  async list(filters: { page?: number; limit?: number; status?: string; search?: string }) {
    const page = filters.page ?? 1
    const limit = Math.min(filters.limit ?? 20, 100)

    const query = Tenant.query().whereNull('deleted_at').orderBy('created_at', 'desc')

    if (filters.status) query.where('status', filters.status)
    if (filters.search) {
      query.where((sub) => {
        sub.whereILike('name', `%${filters.search}%`).orWhereILike('slug', `%${filters.search}%`)
      })
    }

    return query.paginate(page, limit)
  }

  async findById(id: string): Promise<Tenant> {
    const tenant = await Tenant.query()
      .where('id', id)
      .whereNull('deleted_at')
      .preload('settings')
      .preload('branding')
      .preload('domains')
      .first()

    if (!tenant) {
      throw new TenantNotFoundException()
    }

    return tenant
  }

  async getCurrentOrganization(): Promise<Tenant> {
    const tenantId = tenantContext.requireTenantId()
    return this.findById(tenantId)
  }

  async create(dto: CreateTenantDto, actorId?: string): Promise<Tenant> {
    const result = await tenantOnboardingService.onboardOrganization({
      name: dto.name,
      slug: dto.slug,
      planSlug: dto.planSlug,
      owner:
        dto.ownerEmail && dto.ownerPassword && dto.ownerFullName
          ? {
              email: dto.ownerEmail,
              password: dto.ownerPassword,
              fullName: dto.ownerFullName,
            }
          : undefined,
    })

    await auditService.log({
      tenantId: result.tenant.id,
      userId: actorId ?? null,
      action: AuditAction.CREATE,
      entityType: 'tenant',
      entityId: result.tenant.id,
      metadata: { source: 'admin' },
    })

    return result.tenant
  }

  async update(tenantId: string, dto: UpdateTenantDto, actorId?: string): Promise<Tenant> {
    const tenant = await this.findById(tenantId)

    if (dto.name !== undefined) tenant.name = dto.name
    if (dto.slug !== undefined) tenant.slug = dto.slug
    if (dto.planTier !== undefined) tenant.planTier = dto.planTier

    await tenant.save()

    await auditService.log({
      tenantId: tenant.id,
      userId: actorId ?? null,
      action: AuditAction.UPDATE,
      entityType: 'tenant',
      entityId: tenant.id,
      newValues: dto as Record<string, unknown>,
    })

    return tenant
  }

  async suspend(tenantId: string, actorId?: string): Promise<Tenant> {
    const tenant = await this.findById(tenantId)
    tenant.status = TenantStatus.SUSPENDED
    await tenant.save()

    await auditService.log({
      tenantId: tenant.id,
      userId: actorId ?? null,
      action: AuditAction.UPDATE,
      entityType: 'tenant',
      entityId: tenant.id,
      metadata: { action: 'suspend' },
    })

    return tenant
  }

  async activate(tenantId: string, actorId?: string): Promise<Tenant> {
    const tenant = await this.findById(tenantId)
    tenant.status = TenantStatus.ACTIVE
    await tenant.save()

    await auditService.log({
      tenantId: tenant.id,
      userId: actorId ?? null,
      action: AuditAction.UPDATE,
      entityType: 'tenant',
      entityId: tenant.id,
      metadata: { action: 'activate' },
    })

    return tenant
  }

  async softDelete(tenantId: string, actorId?: string): Promise<void> {
    const tenant = await this.findById(tenantId)
    tenant.status = TenantStatus.CANCELLED
    tenant.deletedAt = DateTime.now()
    await tenant.save()

    await User.query()
      .where('tenant_id', tenantId)
      .whereNull('deleted_at')
      .update({ status: 'inactive', deleted_at: DateTime.now().toSQL() })

    await auditService.log({
      tenantId: tenant.id,
      userId: actorId ?? null,
      action: AuditAction.DELETE,
      entityType: 'tenant',
      entityId: tenant.id,
    })
  }

  serializeTenant(tenant: Tenant) {
    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      status: tenant.status,
      planTier: tenant.planTier,
      trialEndsAt: tenant.trialEndsAt,
      createdAt: tenant.createdAt,
      updatedAt: tenant.updatedAt,
      settings: tenant.settings
        ? {
            timezone: tenant.settings.timezone,
            locale: tenant.settings.locale,
            dateFormat: tenant.settings.dateFormat,
            trackingPrefix: tenant.settings.trackingPrefix,
            notificationPreferences: tenant.settings.notificationPreferences,
            featureFlags: tenant.settings.featureFlags,
          }
        : undefined,
      branding: tenant.branding
        ? {
            logoUrl: tenant.branding.logoUrl,
            faviconUrl: tenant.branding.faviconUrl,
            primaryColor: tenant.branding.primaryColor,
            secondaryColor: tenant.branding.secondaryColor,
            loginBackgroundUrl: tenant.branding.loginBackgroundUrl,
            customCss: tenant.branding.customCss,
          }
        : undefined,
      domains: tenant.domains?.map((d) => ({
        id: d.id,
        domain: d.domain,
        isPrimary: d.isPrimary,
        isVerified: d.isVerified,
      })),
    }
  }
}

export const tenantService = new TenantService()
