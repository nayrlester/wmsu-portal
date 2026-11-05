import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import { t } from '#modules/finance/helpers/db_schema'
import Organization from '#modules/finance/models/organization'
import JournalEntry from '#modules/finance/models/journal_entry'
import Fund from '#modules/finance/models/fund'
import ChartOfAccount from '#modules/finance/models/chart_of_account'
import BudgetLine from '#modules/finance/models/budget_line'

export default class JournalEntryLine extends BaseModel {
  static table = t('journal_entry_lines')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare journalEntryId: string

  @column()
  declare lineNo: number

  @column()
  declare fundId: string

  @column()
  declare accountId: string

  @column()
  declare budgetLineId: string | null

  @column()
  declare debitAmount: string

  @column()
  declare creditAmount: string

  @column()
  declare subsidiaryEntityType: string | null

  @column()
  declare subsidiaryEntityRef: string | null

  @column()
  declare particulars: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  @belongsTo(() => JournalEntry, { foreignKey: 'journalEntryId' })
  declare journalEntry: BelongsTo<typeof JournalEntry>

  @belongsTo(() => Fund)
  declare fund: BelongsTo<typeof Fund>

  @belongsTo(() => ChartOfAccount, { foreignKey: 'accountId' })
  declare account: BelongsTo<typeof ChartOfAccount>

  @belongsTo(() => BudgetLine)
  declare budgetLine: BelongsTo<typeof BudgetLine>
}
