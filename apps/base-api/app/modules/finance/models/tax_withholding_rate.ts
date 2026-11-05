import { BaseModel, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'
import { t } from '#modules/finance/helpers/db_schema'

export default class TaxWithholdingRate extends BaseModel {
  static table = t('tax_withholding_rates')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare rateCode: string

  @column()
  declare description: string

  @column()
  declare ratePercent: string

  @column()
  declare isActive: boolean

  @column()
  declare createdBy: string | null

  @column()
  declare updatedBy: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null
}
