import { BaseModel, column } from '@adonisjs/lucid/orm'
import { t } from '#modules/enrollment/helpers/db_schema'
import { DateTime } from 'luxon'

export default class GradeEntryHistory extends BaseModel {
  static table = t('grade_entry_history')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare gradeEntryId: string

  @column()
  declare oldMarkCode: string | null

  @column()
  declare oldNumericGrade: number | null

  @column()
  declare newMarkCode: string | null

  @column()
  declare newNumericGrade: number | null

  @column()
  declare cause: string

  @column()
  declare actorUserId: string | null

  @column({
    prepare: (value: unknown) => (value == null ? null : JSON.stringify(value)),
    consume: (value: string | unknown) => (typeof value === 'string' ? JSON.parse(value) : value),
  })
  declare meta: Record<string, unknown> | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime
}
