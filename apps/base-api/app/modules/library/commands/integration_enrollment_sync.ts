import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import IntegrationService from '#modules/library/services/integrations/integration_service'
import Tenant from '#modules/library/models/tenant'
import { tenantContext, toTenantContext } from '#modules/library/services/tenant/tenant_context'
import env from '#start/env'

export default class IntegrationEnrollmentSync extends BaseCommand {
  static commandName = 'integrations:sync-enrollment'
  static description = 'INT-LIB-01 — upsert library patrons from enrollment.students (scheduled job)'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    const slug = (env.get('DEFAULT_TENANT_SLUG', 'ulmis') ?? 'ulmis').toLowerCase()
    const tenant = await Tenant.query().where('slug', slug).first()
    if (!tenant) {
      this.logger.error(`Tenant not found for slug ${slug}`)
      this.exitCode = 1
      return
    }

    const service = new IntegrationService()
    const result = await tenantContext.run(toTenantContext(tenant), () => service.syncFromEnrollment())

    this.logger.success(
      `Enrollment sync (${result.source}): created ${result.created}, updated ${result.updated}, skipped ${result.skipped}`
    )
  }
}
