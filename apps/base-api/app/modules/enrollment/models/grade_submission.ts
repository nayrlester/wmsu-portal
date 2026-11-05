import { BaseModel, column } from '@adonisjs/lucid/orm'
import { t } from '#modules/enrollment/helpers/db_schema'
import { DateTime } from 'luxon'

export default class GradeSubmission extends BaseModel {
  static table = t('grade_submissions')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare classRecordId: string

  @column()
  declare submittedBy: string

  @column.dateTime()
  declare submittedAt: DateTime

  @column()
  declare entryCount: number

  @column()
  declare locked: boolean

  @column({
    prepare: (value: unknown) => (value == null ? null : JSON.stringify(value)),
    consume: (value: string | unknown) => (typeof value === 'string' ? JSON.parse(value) : value),
  })
  declare payloadSnapshot: Record<string, unknown> | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
