import { BaseSeeder } from '@adonisjs/lucid/seeders'
import RbacService from '#modules/library/services/auth/rbac_service'

export default class extends BaseSeeder {
  private rbacService = new RbacService()

  async run() {
    await this.rbacService.ensureGlobalPermissions()
  }
}
