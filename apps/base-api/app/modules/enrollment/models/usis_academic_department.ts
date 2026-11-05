import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { t } from '#modules/enrollment/helpers/db_schema'
import Organization from '#modules/enrollment/models/organization'
import UsisCollege from '#modules/enrollment/models/usis_college'

export default class UsisAcademicDepartment extends BaseModel {
  static table = t('usis_academic_departments')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare collegeId: string

  @column()
  declare code: string

  @column()
  declare name: string

  @column()
  declare headName: string | null

  @column()
  declare headPlatformUserId: string | null

  @column()
  declare isActive: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  @belongsTo(() => UsisCollege, { foreignKey: 'collegeId' })
  declare college: BelongsTo<typeof UsisCollege>
}
