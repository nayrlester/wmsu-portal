import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import { t } from '#modules/finance/helpers/db_schema'
import Organization from '#modules/finance/models/organization'
import BudgetDocument from '#modules/finance/models/budget_document'
import Fund from '#modules/finance/models/fund'
import ChartOfAccount from '#modules/finance/models/chart_of_account'

export default class BudgetDocumentLine extends BaseModel {
  static table = t('budget_document_lines')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare documentId: string

  @column()
  declare lineNo: number

  @column()
  declare fundId: string

  @column()
  declare accountId: string

  @column()
  declare uacsCode: string | null

  @column()
  declare effect: string

  @column()
  declare amount: string

  @column()
  declare remarks: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  @belongsTo(() => BudgetDocument, { foreignKey: 'documentId' })
  declare document: BelongsTo<typeof BudgetDocument>

  @belongsTo(() => Fund)
  declare fund: BelongsTo<typeof Fund>

  @belongsTo(() => ChartOfAccount, { foreignKey: 'accountId' })
  declare account: BelongsTo<typeof ChartOfAccount>
}
