import type { HttpContext } from '@adonisjs/core/http'
import env from '#start/env'
import db from '@adonisjs/lucid/services/db'
import { t } from '#modules/finance/helpers/db_schema'
import { receivablesService } from '#modules/finance/services/ufms/receivables_service'
import { resolveFinanceOrganizationId } from '#modules/finance/services/ufms/resolve_organization_id'

export default class InternalClearanceController {
  async checkClearance({ params, request, response }: HttpContext) {
    const studentNumber = params.studentNumber
    let organizationId = String(request.input('organizationId') ?? '').trim()
    if (!organizationId) {
      organizationId =
        env.get('PLATFORM_DEFAULT_ORG_ID')?.trim() ||
        String((await db.from(t('organizations')).orderBy('code').first())?.id ?? '')
    }
    if (!organizationId) {
      return response.badRequest({ error: 'organizationId is required' })
    }
    organizationId = await resolveFinanceOrganizationId(organizationId)

    const data = await receivablesService.getClearance(organizationId, studentNumber)

    return response.ok({ data })
  }
}
