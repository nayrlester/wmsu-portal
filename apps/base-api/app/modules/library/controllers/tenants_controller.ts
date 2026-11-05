import type { HttpContext } from '@adonisjs/core/http'
import Tenant from '#modules/library/models/tenant'
import RbacService from '#modules/library/services/auth/rbac_service'
import ForbiddenException from '#modules/library/exceptions/forbidden_exception'
import { resolveTenantSlug } from '#modules/library/services/deployment/deployment_mode'
import { updateTenantValidator } from '#modules/library/validators/tenant'

export default class TenantsController {
  private rbac = new RbacService()

  private serialize(tenant: Tenant) {
    return {
      id: tenant.id,
      slug: tenant.slug,
      name: tenant.name,
      type: tenant.type,
      status: tenant.status,
      timezone: tenant.timezone,
      locale: tenant.locale,
      logoUrl: tenant.logoUrl,
      primaryColor: tenant.primaryColor,
      reportScheduleEnabled: tenant.reportScheduleEnabled,
      reportScheduleCron: tenant.reportScheduleCron,
      reportScheduleEmails: tenant.reportScheduleEmails,
    }
  }

  async resolve({ request, response }: HttpContext) {
    const slug = resolveTenantSlug(request.input('slug') ?? request.header('x-tenant-slug'))

    if (!slug) {
      return response.badRequest({
        success: false,
        message: 'Slug is required',
      })
    }

    const tenant = await Tenant.query().where('slug', slug).first()

    if (!tenant || tenant.status !== 'active') {
      return response.notFound({
        success: false,
        message: 'Tenant not found',
        code: 'TENANT_NOT_FOUND',
      })
    }

    return response.ok({
      success: true,
      data: {
        id: tenant.id,
        slug: tenant.slug,
        name: tenant.name,
        type: tenant.type,
      },
    })
  }

  async current({ response, tenant }: HttpContext) {
    const row = await Tenant.findOrFail(tenant!.id)
    return response.ok({
      success: true,
      data: { tenant: this.serialize(row) },
    })
  }

  async update(ctx: HttpContext) {
    if (!ctx.authUser || !this.rbac.hasPermission(ctx.authUser.permissions, 'settings:update')) {
      throw new ForbiddenException('Missing permission: settings:update')
    }

    const payload = await ctx.request.validateUsing(updateTenantValidator)
    const row = await Tenant.findOrFail(ctx.tenant!.id)

    if (payload.name !== undefined) row.name = payload.name
    if (payload.timezone !== undefined) row.timezone = payload.timezone
    if (payload.locale !== undefined) row.locale = payload.locale
    if (payload.logoUrl !== undefined) row.logoUrl = payload.logoUrl || null
    if (payload.primaryColor !== undefined) row.primaryColor = payload.primaryColor || null
    if (payload.reportScheduleEnabled !== undefined) {
      row.reportScheduleEnabled = payload.reportScheduleEnabled
    }
    if (payload.reportScheduleCron !== undefined) {
      row.reportScheduleCron = payload.reportScheduleCron || null
    }
    if (payload.reportScheduleEmails !== undefined) {
      row.reportScheduleEmails = payload.reportScheduleEmails || null
    }

    await row.save()

    return ctx.response.ok({
      success: true,
      message: 'Tenant settings updated',
      data: { tenant: this.serialize(row) },
    })
  }
}
