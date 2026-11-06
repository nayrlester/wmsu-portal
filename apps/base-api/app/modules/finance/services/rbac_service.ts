import Permission from '#modules/finance/models/permission'
import Role from '#modules/finance/models/role'
import User from '#modules/finance/models/user'
import { FINANCE_ACCOUNTING_PERMISSION_CODES, UFMS_PERMISSIONS } from '#modules/finance/domain/ufms_permissions'
import { UIMS_PERMISSIONS } from '#modules/finance/domain/enums/index'

export class RbacService {
  async listPermissions(): Promise<Permission[]> {
    return Permission.query().orderBy('module').orderBy('name')
  }

  async listRoles(orgId: string): Promise<Role[]> {
    return Role.query().where('organizationId', orgId).preload('permissions').orderBy('name')
  }

  async getRole(orgId: string, id: string): Promise<Role> {
    return Role.query()
      .where('organizationId', orgId)
      .where('id', id)
      .preload('permissions')
      .firstOrFail()
  }

  async createRole(orgId: string, data: { slug: string; name: string; permissionIds?: string[] }) {
    const role = await Role.create({ organizationId: orgId, slug: data.slug, name: data.name })
    if (data.permissionIds?.length) {
      await role.related('permissions').attach(data.permissionIds)
    }
    await role.load('permissions')
    return role
  }

  async updateRole(orgId: string, id: string, data: { name?: string; permissionIds?: string[] }) {
    const role = await this.getRole(orgId, id)
    if (data.name) {
      role.name = data.name
      await role.save()
    }
    if (data.permissionIds !== undefined) {
      await role.related('permissions').sync(data.permissionIds)
    }
    await role.load('permissions')
    return role
  }

  async deleteRole(orgId: string, id: string) {
    const role = await this.getRole(orgId, id)
    if (role.slug === 'admin') throw new Error('Cannot delete admin role')
    await role.delete()
  }

  async getUserPermissions(user: User): Promise<string[]> {
    if (!user) return []

    // Prefer query preload — safer than model.load when the instance was attached via SSO.
    const withRoles = await User.query()
      .where('id', user.id)
      .preload('roles', (q) => {
        q.wherePivot('organization_id', user.organizationId).preload('permissions')
      })
      .first()

    const roles = withRoles?.roles ?? []
    const codes = new Set<string>()
    for (const role of roles) {
      if (role.slug === 'admin') {
        const all = await Permission.all()
        return all.map((p) => p.code)
      }
      for (const perm of role.permissions ?? []) {
        codes.add(perm.code)
      }
    }

    return Array.from(codes)
  }

  async ensureLocalFinancePersonaRole(user: User) {
    const withRoles = await User.query()
      .where('id', user.id)
      .preload('roles', (q) => q.wherePivot('organization_id', user.organizationId))
      .first()
    if (!withRoles) return
    if (withRoles.roles.some((r) => r.slug === 'admin')) return
    if (withRoles.roles.some((r) => r.slug === 'finance_accounting')) {
      await this.ensureFinanceAccountingRole(user.organizationId)
      return
    }

    const local = await this.getUserPermissions(user)
    if (local.includes('finance.write') || local.includes('accounting.write')) return

    const localPart = user.email.split('@')[0]?.toLowerCase() ?? ''
    const financePersona =
      /(?:^|[._-])(accounting|cashier|finance|bursar)(?:[._-]|$)/.test(localPart) ||
      localPart.includes('accounting') ||
      localPart.includes('cashier')

    if (!financePersona) return

    const role = await this.ensureFinanceAccountingRole(user.organizationId)
    const hasRole = withRoles.roles.some((r) => r.id === role.id)
    if (hasRole) return
    await user.related('roles').detach()
    await user.related('roles').attach({
      [role.id]: { organization_id: user.organizationId },
    })
  }

  async ensureFinanceAccountingRole(orgId: string) {
    for (const p of [...UFMS_PERMISSIONS, ...UIMS_PERMISSIONS]) {
      await Permission.updateOrCreate({ code: p.code }, { name: p.name, module: p.module })
    }
    const role = await Role.updateOrCreate(
      { organizationId: orgId, slug: 'finance_accounting' },
      { organizationId: orgId, slug: 'finance_accounting', name: 'Finance & Accounting' }
    )
    const all = await Permission.all()
    const ids = all
      .filter((p) => FINANCE_ACCOUNTING_PERMISSION_CODES.includes(p.code as never))
      .map((p) => p.id)
    await role.related('permissions').sync(ids)
    return role
  }

  async getEffectivePermissions(user: User, platformPermissions?: string[]): Promise<string[]> {
    const local = await this.getUserPermissions(user)
    if (!platformPermissions?.length) {
      return local
    }
    if (platformPermissions.includes('*')) {
      const all = await Permission.all()
      return all.map((p) => p.code)
    }
    return [...new Set([...platformPermissions, ...local])]
  }
}

export const rbacService = new RbacService()
