import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import { t } from '#modules/finance/helpers/db_schema'
import Organization from '#modules/finance/models/organization'
import Bank from '#modules/finance/models/bank'
import Fund from '#modules/finance/models/fund'

export default class BankAccount extends BaseModel {
  static table = t('bank_accounts')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare bankId: string

  @column()
  declare fundId: string | null

  @column()
  declare accountNumber: string

  @column()
  declare accountName: string

  @column()
  declare currencyCode: string

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

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  @belongsTo(() => Bank)
  declare bank: BelongsTo<typeof Bank>

  @belongsTo(() => Fund)
  declare fund: BelongsTo<typeof Fund>
}
