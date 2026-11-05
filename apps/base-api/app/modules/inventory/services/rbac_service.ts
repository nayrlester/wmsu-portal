import Permission from '#modules/inventory/models/permission'
import Role from '#modules/inventory/models/role'
import User from '#modules/inventory/models/user'

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

  async getEffectivePermissions(user: User, platformPermissions?: string[]): Promise<string[]> {
    if (platformPermissions?.length) {
      if (platformPermissions.includes('*')) {
        const all = await Permission.all()
        return all.map((p) => p.code)
      }
      return platformPermissions
    }
    return this.getUserPermissions(user)
  }
}

export const rbacService = new RbacService()
