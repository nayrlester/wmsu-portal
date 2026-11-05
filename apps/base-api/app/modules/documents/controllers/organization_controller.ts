import type { HttpContext } from '@adonisjs/core/http'
import { updateOrganizationValidator } from '#modules/documents/validators/tenant'
import { tenantService } from '#modules/documents/services/tenant_service'
import { requireTenantId } from '#modules/documents/domain/tenant_resolver'
import { TenantPolicy } from '#modules/documents/domain/policies/tenant_policy'

export default class OrganizationController {
  async show(ctx: HttpContext) {
    const { auth, response } = ctx
    const user = auth.user!
    const tenantId = requireTenantId(ctx)
    const tenant = await tenantService.findById(tenantId)
    TenantPolicy.assertTenantAccess(user, tenant)
    return response.ok(tenantService.serializeTenant(tenant))
  }

  async update(ctx: HttpContext) {
    const { auth, request, response } = ctx
    const user = auth.user!
    const tenantId = requireTenantId(ctx)

    await TenantPolicy.assertTenantSettings(user, tenantId)

    const payload = await request.validateUsing(updateOrganizationValidator)
    const tenant = await tenantService.update(tenantId, payload, user.id)
    return response.ok(tenantService.serializeTenant(tenant))
  }
}
