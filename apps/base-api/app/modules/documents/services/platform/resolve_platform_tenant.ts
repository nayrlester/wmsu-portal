import Tenant from '#modules/documents/models/tenant'
import env from '#start/env'
import type { PlatformAccessClaims } from '#modules/documents/services/platform/platform_identity'

/**
 * Resolves which UDMS tenant an Identity JWT maps to.
 */
export async function resolveUdmsTenantForClaims(
  claims: PlatformAccessClaims,
  externalTenantId?: string
): Promise<Tenant> {
  let tenant: Tenant | null = null

  if (externalTenantId && externalTenantId !== 'linked') {
    tenant = await Tenant.find(externalTenantId)
  }

  if (!tenant) {
    tenant = await Tenant.query().where('platform_organization_id', claims.org_id).first()
  }

  const defaultTenantId = env.get('PLATFORM_DEFAULT_TENANT_ID')
  if (!tenant && defaultTenantId) {
    tenant = await Tenant.find(defaultTenantId)
  }

  const defaultSlug = env.get('PLATFORM_DEFAULT_TENANT_SLUG') ?? 'demo-gov'
  if (!tenant) {
    tenant = await Tenant.query()
      .where('slug', defaultSlug)
      .where('status', 'active')
      .whereNull('deleted_at')
      .first()
  }

  if (!tenant && env.get('PLATFORM_AUTO_PROVISION', false)) {
    tenant = await Tenant.query()
      .where('status', 'active')
      .whereNull('deleted_at')
      .orderBy('created_at', 'asc')
      .first()
  }

  if (!tenant && env.get('PLATFORM_AUTO_PROVISION', false)) {
    tenant = await Tenant.query().whereNull('deleted_at').orderBy('created_at', 'asc').first()
  }

  if (!tenant) {
    throw new Error(
      'No UDMS tenant linked to platform organization. Set PLATFORM_DEFAULT_TENANT_SLUG or link platform_organization_id.'
    )
  }

  if (tenant.platformOrganizationId && tenant.platformOrganizationId !== claims.org_id) {
    throw new Error('Token organization mismatch for UDMS tenant')
  }

  if (!tenant.platformOrganizationId) {
    tenant.platformOrganizationId = claims.org_id
    await tenant.save()
  }

  return tenant
}
