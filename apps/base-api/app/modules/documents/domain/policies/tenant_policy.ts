import type User from '#modules/documents/models/user'
import type Tenant from '#modules/documents/models/tenant'
import { TenantAccessDeniedException } from '#modules/documents/domain/exceptions/tenant_exceptions'

export class TenantPolicy {
  static isSuperAdmin(user: User): boolean {
    return user.isSuperAdmin === true
  }

  static canManagePlatform(user: User): boolean {
    return this.isSuperAdmin(user)
  }

  static canManageOrganization(user: User): boolean {
    return this.isSuperAdmin(user) || user.tenantId !== null
  }

  static async canManageTenantSettings(user: User, tenantId: string): Promise<boolean> {
    if (this.isSuperAdmin(user)) return true
    if (user.tenantId !== tenantId) return false
    return user.hasPermission('settings.manage', tenantId)
  }

  static async canManageBranding(user: User, tenantId: string): Promise<boolean> {
    return this.canManageTenantSettings(user, tenantId)
  }

  static async canManageDomains(user: User, tenantId: string): Promise<boolean> {
    return this.canManageTenantSettings(user, tenantId)
  }

  static assertPlatformAdmin(user: User): void {
    if (!this.canManagePlatform(user)) {
      throw new TenantAccessDeniedException('Super admin access required')
    }
  }

  static async assertTenantSettings(user: User, tenantId: string): Promise<void> {
    if (!(await this.canManageTenantSettings(user, tenantId))) {
      throw new TenantAccessDeniedException('Insufficient permissions to manage organization settings')
    }
  }

  static assertTenantAccess(user: User, tenant: Tenant): void {
    if (this.isSuperAdmin(user)) return
    if (user.tenantId !== tenant.id) {
      throw new TenantAccessDeniedException('You do not belong to this organization')
    }
  }

  static assertResolvedTenant(user: User, tenantId: string): void {
    if (this.isSuperAdmin(user)) return
    if (user.tenantId !== tenantId) {
      throw new TenantAccessDeniedException('Cross-tenant access is not permitted')
    }
  }
}
