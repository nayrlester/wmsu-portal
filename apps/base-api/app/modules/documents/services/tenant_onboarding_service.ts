import { DateTime } from 'luxon'
import User from '#modules/documents/models/user'
import Tenant from '#modules/documents/models/tenant'
import TenantSetting from '#modules/documents/models/tenant_setting'
import TenantBranding from '#modules/documents/models/tenant_branding'
import { tenantProvisioningService } from '#modules/documents/services/tenant_provisioning_service'
import { defaultWorkflowService } from '#modules/documents/services/default_workflow_service'
import { subscriptionService } from '#modules/documents/services/subscription_service'
import { auditService } from '#modules/documents/services/audit_service'
import { PlanSlug, TenantStatus, AuditAction } from '#modules/documents/domain/enums/index'

export interface OnboardOrganizationInput {
  name: string
  slug?: string
  owner?: {
    email: string
    password: string
    fullName: string
  }
  planSlug?: PlanSlug
  trialDays?: number
}

export interface OnboardOrganizationResult {
  tenant: Tenant
  owner?: User
  settings: TenantSetting
  branding: TenantBranding
}

export class TenantOnboardingService {
  generateSlug(name: string): string {
    const base = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 50)

    return `${base}-${Date.now().toString(36)}`
  }

  async onboardOrganization(input: OnboardOrganizationInput): Promise<OnboardOrganizationResult> {
    const slug = input.slug ?? this.generateSlug(input.name)
    const trialDays = input.trialDays ?? 14

    const tenant = await Tenant.create({
      name: input.name,
      slug,
      status: TenantStatus.TRIALING,
      planTier: input.planSlug ?? PlanSlug.STARTER,
      trialEndsAt: DateTime.now().plus({ days: trialDays }),
    })

    const settings = await TenantSetting.create({
      tenantId: tenant.id,
      timezone: 'Asia/Manila',
      locale: 'en',
      dateFormat: 'YYYY-MM-DD',
      trackingPrefix: 'DTS',
    })

    const branding = await TenantBranding.create({
      tenantId: tenant.id,
      primaryColor: '#2563eb',
      secondaryColor: '#1e40af',
    })

    await tenantProvisioningService.provisionDefaultRoles(tenant.id)
    await subscriptionService.createTrialSubscription(tenant.id, input.planSlug ?? PlanSlug.STARTER)

    let owner: User | undefined

    if (input.owner) {
      owner = await User.create({
        tenantId: tenant.id,
        email: input.owner.email.toLowerCase(),
        password: input.owner.password,
        fullName: input.owner.fullName,
        status: 'active',
        emailVerified: false,
      })

      await tenantProvisioningService.assignOwnerRole(owner, tenant.id)
      await defaultWorkflowService.ensureWorkflowReady(tenant.id, owner.id)
    }

    await auditService.log({
      tenantId: tenant.id,
      userId: owner?.id ?? null,
      action: AuditAction.CREATE,
      entityType: 'tenant',
      entityId: tenant.id,
      newValues: { name: tenant.name, slug: tenant.slug },
    })

    return { tenant, owner, settings, branding }
  }
}

export const tenantOnboardingService = new TenantOnboardingService()
