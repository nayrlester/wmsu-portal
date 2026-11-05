import { BaseModel, column } from '@adonisjs/lucid/orm'
import { t } from '#modules/enrollment/helpers/db_schema'
import { DateTime } from 'luxon'

export default class FinanceIntegrationTransaction extends BaseModel {
  static table = t('finance_integration_transactions')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare enrollmentId: string | null

  @column()
  declare assessmentId: string | null

  @column()
  declare operation: string

  @column()
  declare idempotencyKey: string

  @column()
  declare direction: string

  @column()
  declare status: string

  @column()
  declare httpStatus: number | null

  @column()
  declare requestPayload: Record<string, unknown> | null

  @column()
  declare responsePayload: Record<string, unknown> | null

  @column()
  declare errorMessage: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime
}
