import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import { t } from '#modules/finance/helpers/db_schema'

export default class CoaController {
  async index({ request, response, auth }: HttpContext) {
    const user = auth.user!
    const page = request.input('page', 1)
    const limit = request.input('limit', 50)

    const accounts = await db
      .from(t('chart_of_accounts'))
      .where('organization_id', user.organizationId)
      .orderBy('account_code', 'asc')
      .paginate(page, limit)

    return response.ok({ data: accounts })
  }

  async store({ request, response, auth }: HttpContext) {
    const user = auth.user!
    const payload = request.only(['accountCode', 'accountTitle', 'accountType', 'parentId'])

    const [account] = await db.table(t('chart_of_accounts')).insert({
      organization_id: user.organizationId,
      account_code: payload.accountCode,
      account_title: payload.accountTitle,
      account_type: payload.accountType,
      parent_id: payload.parentId,
      is_active: true,
      created_at: new Date(),
    }).returning('*')

    return response.created({ data: account })
  }
}
