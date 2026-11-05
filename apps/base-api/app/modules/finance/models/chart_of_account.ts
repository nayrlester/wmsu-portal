import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import { t } from '#modules/finance/helpers/db_schema'
import Organization from '#modules/finance/models/organization'
import User from '#modules/finance/models/user'

export default class ChartOfAccount extends BaseModel {
  static table = t('chart_of_accounts')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare accountCode: string

  @column()
  declare accountTitle: string

  @column()
  declare accountType: string

  @column()
  declare parentId: string | null

  @column()
  declare uacsCode: string | null

  @column()
  declare description: string | null

  @column()
  declare contraAccountId: string | null

  @column()
  declare subsidiaryTag: string | null

  @column()
  declare sortOrder: number

  @column()
  declare isPostable: boolean

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

  @belongsTo(() => ChartOfAccount, { foreignKey: 'parentId' })
  declare parent: BelongsTo<typeof ChartOfAccount>

  @belongsTo(() => ChartOfAccount, { foreignKey: 'contraAccountId' })
  declare contraAccount: BelongsTo<typeof ChartOfAccount>

  @belongsTo(() => User, { foreignKey: 'createdBy' })
  declare creator: BelongsTo<typeof User>
}
