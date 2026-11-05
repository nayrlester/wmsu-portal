import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import { t } from '#modules/enrollment/helpers/db_schema'
import { DateTime } from 'luxon'
import Section from '#modules/enrollment/models/section'
import AcademicYear from '#modules/enrollment/models/academic_year'
import GradingScheme from '#modules/enrollment/models/grading_scheme'
import User from '#modules/enrollment/models/user'
import GradeEntry from '#modules/enrollment/models/grade_entry'

export default class ClassRecord extends BaseModel {
  static table = t('class_records')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare sectionId: string

  @column()
  declare academicYearId: string

  @column()
  declare semester: number

  @column()
  declare subjectId: string | null

  @column()
  declare subjectCode: string

  @column()
  declare subjectTitle: string

  @column()
  declare units: number

  @column()
  declare gradingSchemeId: string | null

  @column()
  declare facultyUserId: string | null

  @column()
  declare status: string

  @column.dateTime()
  declare submittedAt: DateTime | null

  @column()
  declare submittedBy: string | null

  @column.dateTime()
  declare lockedAt: DateTime | null

  @column({
    prepare: (value: unknown) => (value == null ? null : JSON.stringify(value)),
    consume: (value: string | unknown) => (typeof value === 'string' ? JSON.parse(value) : value),
  })
  declare signatoriesJson: Array<{ role: string; name: string }> | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Section)
  declare section: BelongsTo<typeof Section>

  @belongsTo(() => AcademicYear)
  declare academicYear: BelongsTo<typeof AcademicYear>

  @belongsTo(() => GradingScheme)
  declare gradingScheme: BelongsTo<typeof GradingScheme>

  @belongsTo(() => User, { foreignKey: 'facultyUserId' })
  declare faculty: BelongsTo<typeof User>

  @hasMany(() => GradeEntry)
  declare entries: HasMany<typeof GradeEntry>
}
