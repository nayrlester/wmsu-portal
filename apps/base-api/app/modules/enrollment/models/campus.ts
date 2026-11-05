import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import { t } from '#modules/enrollment/helpers/db_schema'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import Organization from '#modules/enrollment/models/organization'
import Office from '#modules/enrollment/models/office'
import Department from '#modules/enrollment/models/department'

export default class Campus extends BaseModel {
  static table = t('campuses')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare name: string

  @column()
  declare code: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  @hasMany(() => Office, { foreignKey: 'campusId' })
  declare offices: HasMany<typeof Office>

  @hasMany(() => Department, { foreignKey: 'campusId' })
  declare departments: HasMany<typeof Department>
}
