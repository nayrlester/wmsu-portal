import { BaseModel, column } from '@adonisjs/lucid/orm'
import { t } from '#modules/finance/helpers/db_schema'
import { DateTime } from 'luxon'

export default class PosTerminal extends BaseModel {
  static table = t('pos_terminals')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare terminalCode: string

  @column()
  declare name: string

  @column()
  declare isActive: boolean

  @column()
  declare fundId: string | null

  @column()
  declare cashAccountId: string | null

  @column()
  declare revenueAccountId: string | null

  @column()
  declare orSeriesId: string | null

  @column()
  declare createdBy: string | null

  @column()
  declare updatedBy: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null
}
