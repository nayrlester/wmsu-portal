import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import { t } from '#modules/enrollment/helpers/db_schema'
import Student from '#modules/enrollment/models/student'

export default class UsisStudentProfileViolation extends BaseModel {
  static table = t('usis_student_profile_violations')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare studentId: string

  @column()
  declare violationCode: string

  @column()
  declare title: string

  @column()
  declare description: string | null

  @column()
  declare status: string

  @column.dateTime()
  declare occurredAt: DateTime | null

  @column()
  declare recordedBy: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Student)
  declare student: BelongsTo<typeof Student>
}
