import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { t } from '#modules/enrollment/helpers/db_schema'
import { DateTime } from 'luxon'
import Section from '#modules/enrollment/models/section'
import User from '#modules/enrollment/models/user'
import AcademicYear from '#modules/enrollment/models/academic_year'

export default class FacultyClassAssignment extends BaseModel {
  static table = t('faculty_class_assignments')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare sectionId: string

  @column()
  declare facultyUserId: string

  @column()
  declare academicYearId: string

  @column()
  declare semester: number

  @column()
  declare isActive: boolean

  @column()
  declare assignedBy: string | null

  @column.dateTime()
  declare assignedAt: DateTime

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Section)
  declare section: BelongsTo<typeof Section>

  @belongsTo(() => User, { foreignKey: 'facultyUserId' })
  declare faculty: BelongsTo<typeof User>

  @belongsTo(() => AcademicYear)
  declare academicYear: BelongsTo<typeof AcademicYear>
}
