import { BaseModel, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'
import { t } from '#modules/enrollment/helpers/db_schema'

export default class UsisStudentMergeJob extends BaseModel {
  static table = t('usis_student_merge_jobs')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare survivorStudentId: string

  @column()
  declare duplicateStudentId: string

  @column()
  declare status: string

  @column({
    prepare: (value: Record<string, unknown>) => JSON.stringify(value ?? {}),
    consume: (value: string | Record<string, unknown>) =>
      typeof value === 'string' ? (JSON.parse(value) as Record<string, unknown>) : value ?? {},
  })
  declare reportJson: Record<string, unknown>

  @column()
  declare note: string | null

  @column()
  declare createdBy: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime()
  declare completedAt: DateTime | null
}
