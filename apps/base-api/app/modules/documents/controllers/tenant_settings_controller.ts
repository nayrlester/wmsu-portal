import type { HttpContext } from '@adonisjs/core/http'
import { updateTenantSettingsValidator } from '#modules/documents/validators/tenant'
import { tenantSettingsService } from '#modules/documents/services/tenant_settings_service'
import { tenantContext } from '#modules/documents/domain/tenant_context'
import { TenantPolicy } from '#modules/documents/domain/policies/tenant_policy'

export default class TenantSettingsController {
  async show({ auth, response }: HttpContext) {
    const user = auth.user!
    const tenantId = tenantContext.requireTenantId()
    await TenantPolicy.assertTenantSettings(user, tenantId)

    const settings = await tenantSettingsService.get()
    return response.ok(tenantSettingsService.serialize(settings))
  }

  async update({ auth, request, response }: HttpContext) {
    const user = auth.user!
    const tenantId = tenantContext.requireTenantId()
    await TenantPolicy.assertTenantSettings(user, tenantId)

    const payload = await request.validateUsing(updateTenantSettingsValidator)
    const settings = await tenantSettingsService.update(payload, user.id)
    return response.ok(tenantSettingsService.serialize(settings))
  }
}
