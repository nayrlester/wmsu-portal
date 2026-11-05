import type { HttpContext } from '@adonisjs/core/http'
import { createTenantValidator, updateTenantValidator } from '#modules/documents/validators/tenant'
import { tenantService } from '#modules/documents/services/tenant_service'
import { TenantPolicy } from '#modules/documents/domain/policies/tenant_policy'

export default class AdminTenantsController {
  async index({ request, response }: HttpContext) {
    const tenants = await tenantService.list({
      page: request.input('page', 1),
      limit: request.input('limit', 20),
      status: request.input('status'),
      search: request.input('search'),
    })

    return response.ok({
      data: tenants.all().map((t) => tenantService.serializeTenant(t)),
      meta: tenants.getMeta(),
    })
  }

  async show({ params, response }: HttpContext) {
    const tenant = await tenantService.findById(params.id)
    return response.ok(tenantService.serializeTenant(tenant))
  }

  async store({ request, auth, response }: HttpContext) {
    TenantPolicy.assertPlatformAdmin(auth.user!)
    const payload = await request.validateUsing(createTenantValidator)

    if (payload.ownerEmail && (!payload.ownerPassword || !payload.ownerFullName)) {
      return response.badRequest({
        error: 'ownerFullName and ownerPassword are required when ownerEmail is provided',
      })
    }

    const tenant = await tenantService.create(payload, auth.user!.id)
    return response.created(tenantService.serializeTenant(tenant))
  }

  async update({ params, request, auth, response }: HttpContext) {
    const payload = await request.validateUsing(updateTenantValidator)
    const tenant = await tenantService.update(params.id, payload, auth.user!.id)
    return response.ok(tenantService.serializeTenant(tenant))
  }

  async suspend({ params, auth, response }: HttpContext) {
    const tenant = await tenantService.suspend(params.id, auth.user!.id)
    return response.ok({
      message: 'Organization suspended',
      tenant: tenantService.serializeTenant(tenant),
    })
  }

  async activate({ params, auth, response }: HttpContext) {
    const tenant = await tenantService.activate(params.id, auth.user!.id)
    return response.ok({
      message: 'Organization activated',
      tenant: tenantService.serializeTenant(tenant),
    })
  }

  async destroy({ params, auth, response }: HttpContext) {
    await tenantService.softDelete(params.id, auth.user!.id)
    return response.ok({ message: 'Organization deleted' })
  }
}
