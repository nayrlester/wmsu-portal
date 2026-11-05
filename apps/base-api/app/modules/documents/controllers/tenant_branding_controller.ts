import type { HttpContext } from '@adonisjs/core/http'
import { updateTenantBrandingValidator, publicBrandingValidator } from '#modules/documents/validators/tenant'
import { tenantBrandingService } from '#modules/documents/services/tenant_branding_service'
import { tenantContext } from '#modules/documents/domain/tenant_context'
import { TenantPolicy } from '#modules/documents/domain/policies/tenant_policy'

export default class TenantBrandingController {
  async show({ auth, response }: HttpContext) {
    const user = auth.user!
    const tenantId = tenantContext.requireTenantId()
    await TenantPolicy.assertTenantSettings(user, tenantId)

    const branding = await tenantBrandingService.get()
    return response.ok(tenantBrandingService.serialize(branding))
  }

  async update({ auth, request, response }: HttpContext) {
    const user = auth.user!
    const tenantId = tenantContext.requireTenantId()
    await TenantPolicy.assertTenantSettings(user, tenantId)

    const payload = await request.validateUsing(updateTenantBrandingValidator)
    const branding = await tenantBrandingService.update(payload, user.id)
    return response.ok(tenantBrandingService.serialize(branding))
  }

  async uploadLogo({ auth, request, response }: HttpContext) {
    const user = auth.user!
    const tenantId = tenantContext.requireTenantId()
    await TenantPolicy.assertTenantSettings(user, tenantId)

    const logo = request.file('logo', { size: '2mb', extnames: ['png', 'jpg', 'jpeg', 'webp', 'svg'] })
    if (!logo) {
      return response.badRequest({ error: 'Logo file is required' })
    }

    const branding = await tenantBrandingService.uploadLogo(logo, user.id)
    return response.ok(tenantBrandingService.serialize(branding))
  }

  async publicShow({ request, response }: HttpContext) {
    const { domain } = await request.validateUsing(publicBrandingValidator)
    const branding = await tenantBrandingService.getPublicByDomain(domain)

    if (!branding) {
      return response.notFound({ error: 'Branding not found for domain' })
    }

    return response.ok(branding)
  }
}
