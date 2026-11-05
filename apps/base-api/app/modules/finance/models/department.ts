import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import { t } from '#modules/finance/helpers/db_schema'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import Organization from '#modules/finance/models/organization'
import Campus from '#modules/finance/models/campus'
import Office from '#modules/finance/models/office'

export default class Department extends BaseModel {
  static table = t('departments')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare campusId: string

  @column()
  declare officeId: string | null

  @column()
  declare name: string

  @column()
  declare code: string

  @column()
  declare headName: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  @belongsTo(() => Campus)
  declare campus: BelongsTo<typeof Campus>

  @belongsTo(() => Office)
  declare office: BelongsTo<typeof Office>
}
