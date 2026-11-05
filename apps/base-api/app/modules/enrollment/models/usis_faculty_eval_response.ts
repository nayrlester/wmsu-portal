import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import { t } from '#modules/enrollment/helpers/db_schema'
import Organization from '#modules/enrollment/models/organization'
import UsisFacultyEvalSchedule from '#modules/enrollment/models/usis_faculty_eval_schedule'
import UsisFacultyEvalTarget from '#modules/enrollment/models/usis_faculty_eval_target'
import Student from '#modules/enrollment/models/student'

export type FacultyEvalAnswers = Record<string, number | string>

export default class UsisFacultyEvalResponse extends BaseModel {
  static table = t('usis_faculty_eval_responses')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare scheduleId: string

  @column()
  declare targetId: string

  @column()
  declare studentId: string

  @column({
    prepare: (value: FacultyEvalAnswers) => JSON.stringify(value ?? {}),
    consume: (value: string | FacultyEvalAnswers) =>
      typeof value === 'string' ? (JSON.parse(value) as FacultyEvalAnswers) : value,
  })
  declare answers: FacultyEvalAnswers

  @column.dateTime()
  declare submittedAt: DateTime

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  @belongsTo(() => UsisFacultyEvalSchedule, { foreignKey: 'scheduleId' })
  declare schedule: BelongsTo<typeof UsisFacultyEvalSchedule>

  @belongsTo(() => UsisFacultyEvalTarget, { foreignKey: 'targetId' })
  declare target: BelongsTo<typeof UsisFacultyEvalTarget>

  @belongsTo(() => Student)
  declare student: BelongsTo<typeof Student>
}
