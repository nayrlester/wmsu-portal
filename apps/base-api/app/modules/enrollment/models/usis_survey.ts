import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import { t } from '#modules/enrollment/helpers/db_schema'
import Organization from '#modules/enrollment/models/organization'
import User from '#modules/enrollment/models/user'
import type { AnnouncementAudience } from '#modules/enrollment/models/usis_announcement'

export type SurveyQuestion = {
  id: string
  prompt: string
  questionType: 'single' | 'multi' | 'text' | 'likert'
  options?: string[]
  required?: boolean
}

export default class UsisSurvey extends BaseModel {
  static table = t('usis_surveys')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare kind: 'survey' | 'poll' | string

  @column()
  declare title: string

  @column()
  declare description: string | null

  @column()
  declare status: string

  @column({
    prepare: (value: AnnouncementAudience) => JSON.stringify(value ?? {}),
    consume: (value: string | AnnouncementAudience) =>
      typeof value === 'string' ? (JSON.parse(value) as AnnouncementAudience) : value,
  })
  declare audience: AnnouncementAudience

  @column({
    prepare: (value: SurveyQuestion[]) => JSON.stringify(value ?? []),
    consume: (value: string | SurveyQuestion[]) =>
      typeof value === 'string' ? (JSON.parse(value) as SurveyQuestion[]) : value,
  })
  declare questions: SurveyQuestion[]

  @column.dateTime()
  declare opensAt: DateTime | null

  @column.dateTime()
  declare closesAt: DateTime | null

  @column()
  declare createdBy: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  @belongsTo(() => User, { foreignKey: 'createdBy' })
  declare author: BelongsTo<typeof User>
}
