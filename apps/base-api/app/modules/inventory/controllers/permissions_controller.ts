import type { HttpContext } from '@adonisjs/core/http'
import { rbacService } from '#modules/inventory/services/rbac_service'

export default class PermissionsController {
  async index({ response }: HttpContext) {
    const permissions = await rbacService.listPermissions()
    return response.ok({ data: permissions })
  }
}
