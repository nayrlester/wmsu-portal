import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import { t } from '#modules/records/helpers/db_schema'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import Organization from '#modules/records/models/organization'
import Campus from '#modules/records/models/campus'
import WarehouseBin from '#modules/records/models/warehouse_bin'

export default class Warehouse extends BaseModel {
  static table = t('warehouses')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare campusId: string

  @column()
  declare name: string

  @column()
  declare code: string

  @column()
  declare locationType: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  @belongsTo(() => Campus)
  declare campus: BelongsTo<typeof Campus>

  @hasMany(() => WarehouseBin)
  declare bins: HasMany<typeof WarehouseBin>
}
