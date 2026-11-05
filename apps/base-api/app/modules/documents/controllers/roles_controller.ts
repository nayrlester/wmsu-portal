import type { HttpContext } from '@adonisjs/core/http'
import {
  createRoleValidator,
  updateRoleValidator,
  updateRolePermissionsValidator,
  assignRoleValidator,
} from '#modules/documents/validators/rbac'
import { rbacService } from '#modules/documents/services/rbac_service'

export default class RolesController {
  async index({ response }: HttpContext) {
    const tenantId = rbacService.requireTenantId()
    const roles = await rbacService.listRoles(tenantId)

    return response.ok({
      roles: roles.map((r) => ({
        id: r.id,
        name: r.name,
        slug: r.slug,
        description: r.description,
        isSystem: r.isSystem,
        permissions: r.permissions.map((p) => ({ id: p.id, slug: p.slug, name: p.name })),
      })),
    })
  }

  async show({ params, response }: HttpContext) {
    const tenantId = rbacService.requireTenantId()
    const role = await rbacService.getRole(params.id, tenantId)

    return response.ok({
      id: role.id,
      name: role.name,
      slug: role.slug,
      description: role.description,
      isSystem: role.isSystem,
      permissions: role.permissions.map((p) => ({ id: p.id, slug: p.slug, name: p.name })),
    })
  }

  async store({ request, response }: HttpContext) {
    const tenantId = rbacService.requireTenantId()
    const payload = await request.validateUsing(createRoleValidator)
    const role = await rbacService.createRole(tenantId, payload)

    return response.created({
      id: role.id,
      name: role.name,
      slug: role.slug,
      permissions: role.permissions.map((p) => p.slug),
    })
  }

  async updatePermissions({ params, request, response }: HttpContext) {
    const tenantId = rbacService.requireTenantId()
    const { permissionIds } = await request.validateUsing(updateRolePermissionsValidator)
    const role = await rbacService.updateRolePermissions(params.id, tenantId, permissionIds)

    return response.ok({
      id: role.id,
      permissions: role.permissions.map((p) => p.slug),
    })
  }

  async update({ params, request, response }: HttpContext) {
    const tenantId = rbacService.requireTenantId()
    const payload = await request.validateUsing(updateRoleValidator)
    const role = await rbacService.updateRole(params.id, tenantId, payload)

    return response.ok({
      id: role.id,
      name: role.name,
      slug: role.slug,
      description: role.description,
      permissions: role.permissions.map((p) => ({ id: p.id, slug: p.slug, name: p.name })),
    })
  }

  async destroy({ params, response }: HttpContext) {
    const tenantId = rbacService.requireTenantId()
    await rbacService.deleteRole(params.id, tenantId)
    return response.ok({ message: 'Role deleted successfully' })
  }

  async assignToUser({ params, request, response }: HttpContext) {
    const tenantId = rbacService.requireTenantId()
    const { roleId } = await request.validateUsing(assignRoleValidator)
    await rbacService.assignRoleToUser(params.userId, roleId, tenantId)

    return response.ok({ message: 'Role assigned successfully' })
  }
}
