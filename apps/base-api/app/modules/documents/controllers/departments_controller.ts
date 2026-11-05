import type { HttpContext } from '@adonisjs/core/http'
import { departmentService } from '#modules/documents/services/department_service'
import { tenantContext } from '#modules/documents/domain/tenant_context'
import { TenantPolicy } from '#modules/documents/domain/policies/tenant_policy'
import { createDepartmentValidator, updateDepartmentValidator } from '#modules/documents/validators/department'

export default class DepartmentsController {
  async index({ auth, response }: HttpContext) {
    const user = auth.user!
    const tenantId = tenantContext.requireTenantId()
    await TenantPolicy.assertTenantSettings(user, tenantId)

    const departments = await departmentService.list()
    return response.ok({
      departments: departments.map((department) => departmentService.serialize(department)),
    })
  }

  async store({ auth, request, response }: HttpContext) {
    const user = auth.user!
    const tenantId = tenantContext.requireTenantId()
    await TenantPolicy.assertTenantSettings(user, tenantId)

    const payload = await request.validateUsing(createDepartmentValidator)
    const department = await departmentService.create(payload, user.id)

    return response.created({ department: departmentService.serialize(department) })
  }

  async update({ auth, params, request, response }: HttpContext) {
    const user = auth.user!
    const tenantId = tenantContext.requireTenantId()
    await TenantPolicy.assertTenantSettings(user, tenantId)

    const payload = await request.validateUsing(updateDepartmentValidator)
    const department = await departmentService.update(params.id, payload, user.id)

    return response.ok({ department: departmentService.serialize(department) })
  }

  async destroy({ auth, params, response }: HttpContext) {
    const user = auth.user!
    const tenantId = tenantContext.requireTenantId()
    await TenantPolicy.assertTenantSettings(user, tenantId)

    await departmentService.deactivate(params.id, user.id)
    return response.ok({ message: 'Department deactivated successfully' })
  }
}
