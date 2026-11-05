import type { HttpContext } from '@adonisjs/core/http'
import { rbacService } from '#modules/documents/services/rbac_service'
import { tenantContext } from '#modules/documents/domain/tenant_context'

export default class PermissionsController {
  async index({ response }: HttpContext) {
    const permissions = await rbacService.listPermissions()

    const grouped = permissions.reduce(
      (acc, p) => {
        if (!acc[p.module]) acc[p.module] = []
        acc[p.module]!.push({ id: p.id, slug: p.slug, name: p.name })
        return acc
      },
      {} as Record<string, Array<{ id: string; slug: string; name: string }>>
    )

    return response.ok({ permissions: grouped })
  }

  async myPermissions({ auth, response, platformPermissions }: HttpContext) {
    const user = auth.user!
    const tenantId = tenantContext.getTenantId() ?? user.tenantId

    if (!tenantId && !user.isSuperAdmin) {
      return response.forbidden({ error: 'Tenant context required' })
    }

    const permissions = await rbacService.getEffectivePermissions(
      user,
      tenantId ?? '',
      platformPermissions
    )

    return response.ok({ permissions })
  }
}
