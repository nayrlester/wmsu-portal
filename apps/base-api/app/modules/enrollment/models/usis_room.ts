import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import { t } from '#modules/enrollment/helpers/db_schema'
import Organization from '#modules/enrollment/models/organization'
import UsisBuilding from '#modules/enrollment/models/usis_building'
import UsisRoomCategory from '#modules/enrollment/models/usis_room_category'

export default class UsisRoom extends BaseModel {
  static table = t('usis_rooms')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare buildingId: string

  @column()
  declare categoryId: string | null

  @column()
  declare code: string

  @column()
  declare name: string

  @column()
  declare capacity: number | null

  @column()
  declare isActive: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  @belongsTo(() => UsisBuilding, { foreignKey: 'buildingId' })
  declare building: BelongsTo<typeof UsisBuilding>

  @belongsTo(() => UsisRoomCategory, { foreignKey: 'categoryId' })
  declare category: BelongsTo<typeof UsisRoomCategory>
}
