import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import { t } from '#modules/enrollment/helpers/db_schema'
import Organization from '#modules/enrollment/models/organization'
import UsisAcademicDepartment from '#modules/enrollment/models/usis_academic_department'

export default class UsisCollege extends BaseModel {
  static table = t('usis_colleges')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare code: string

  @column()
  declare name: string

  @column()
  declare deanName: string | null

  @column()
  declare isActive: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  @hasMany(() => UsisAcademicDepartment, { foreignKey: 'collegeId' })
  declare departments: HasMany<typeof UsisAcademicDepartment>
}
