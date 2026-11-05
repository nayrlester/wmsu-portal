import { t } from '#modules/library/helpers/db_schema'
import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class LoanRenewal extends BaseModel {
  static table = t('loan_renewals')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare tenantId: string

  @column()
  declare borrowingId: string

  @column()
  declare renewalNumber: number

  @column.dateTime()
  declare previousDueAt: DateTime | null

  @column.dateTime()
  declare newDueAt: DateTime

  @column()
  declare renewedBy: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime
}
