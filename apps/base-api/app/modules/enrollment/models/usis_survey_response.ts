import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import { t } from '#modules/enrollment/helpers/db_schema'
import Organization from '#modules/enrollment/models/organization'
import UsisSurvey from '#modules/enrollment/models/usis_survey'
import User from '#modules/enrollment/models/user'
import Student from '#modules/enrollment/models/student'

export type SurveyAnswers = Record<string, string | string[] | number>

export default class UsisSurveyResponse extends BaseModel {
  static table = t('usis_survey_responses')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare surveyId: string

  @column()
  declare userId: string

  @column()
  declare studentId: string | null

  @column({
    prepare: (value: SurveyAnswers) => JSON.stringify(value ?? {}),
    consume: (value: string | SurveyAnswers) =>
      typeof value === 'string' ? (JSON.parse(value) as SurveyAnswers) : value,
  })
  declare answers: SurveyAnswers

  @column.dateTime()
  declare submittedAt: DateTime

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  @belongsTo(() => UsisSurvey, { foreignKey: 'surveyId' })
  declare survey: BelongsTo<typeof UsisSurvey>

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @belongsTo(() => Student)
  declare student: BelongsTo<typeof Student>
}
