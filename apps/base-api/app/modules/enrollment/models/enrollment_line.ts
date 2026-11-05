import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { t } from '#modules/enrollment/helpers/db_schema'
import { DateTime } from 'luxon'
import Organization from '#modules/enrollment/models/organization'
import Enrollment from '#modules/enrollment/models/enrollment'
import Section from '#modules/enrollment/models/section'
import Subject from '#modules/enrollment/models/subject'

export default class EnrollmentLine extends BaseModel {
  static table = t('enrollment_lines')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare enrollmentId: string

  @column()
  declare subjectId: string | null

  @column()
  declare subjectCode: string

  @column()
  declare subjectTitle: string

  @column()
  declare units: number

  @column()
  declare sectionId: string | null

  @column()
  declare status: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  @belongsTo(() => Enrollment)
  declare enrollment: BelongsTo<typeof Enrollment>

  @belongsTo(() => Subject)
  declare subject: BelongsTo<typeof Subject>

  @belongsTo(() => Section)
  declare section: BelongsTo<typeof Section>
}
