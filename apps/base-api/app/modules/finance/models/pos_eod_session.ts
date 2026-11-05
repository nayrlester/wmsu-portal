import { BaseModel, column } from '@adonisjs/lucid/orm'
import { t } from '#modules/finance/helpers/db_schema'
import { DateTime } from 'luxon'

export default class PosEodSession extends BaseModel {
  static table = t('pos_eod_sessions')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare terminalId: string | null

  @column()
  declare sessionNumber: string

  @column.date()
  declare businessDate: DateTime

  @column()
  declare cashierId: string | null

  @column()
  declare salesCount: string

  @column()
  declare grossSales: string

  @column()
  declare voidCount: string

  @column()
  declare voidAmount: string

  @column()
  declare netSales: string

  @column()
  declare status: string

  @column.dateTime()
  declare closedAt: DateTime | null

  @column()
  declare notes: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null
}
