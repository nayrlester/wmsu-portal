import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import { t } from '#modules/finance/helpers/db_schema'
import Organization from '#modules/finance/models/organization'
import FiscalPeriod from '#modules/finance/models/fiscal_period'
import FinancialPlan from '#modules/finance/models/financial_plan'
import BudgetDocumentLine from '#modules/finance/models/budget_document_line'

export default class BudgetDocument extends BaseModel {
  static table = t('budget_documents')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare documentType: string

  @column()
  declare fiscalPeriodId: string | null

  @column()
  declare fiscalYear: string

  @column()
  declare title: string

  @column()
  declare description: string | null

  @column()
  declare sourcePlanId: string | null

  @column()
  declare status: string

  @column.dateTime()
  declare submittedAt: DateTime | null

  @column.dateTime()
  declare reviewedAt: DateTime | null

  @column()
  declare submittedBy: string | null

  @column()
  declare reviewedBy: string | null

  @column()
  declare rejectionReason: string | null

  @column()
  declare createdBy: string | null

  @column()
  declare updatedBy: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  @belongsTo(() => FiscalPeriod)
  declare fiscalPeriod: BelongsTo<typeof FiscalPeriod>

  @belongsTo(() => FinancialPlan, { foreignKey: 'sourcePlanId' })
  declare sourcePlan: BelongsTo<typeof FinancialPlan>

  @hasMany(() => BudgetDocumentLine, { foreignKey: 'documentId' })
  declare lines: HasMany<typeof BudgetDocumentLine>
}
