import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { t } from '#modules/enrollment/helpers/db_schema'
import { DateTime } from 'luxon'
import Organization from '#modules/enrollment/models/organization'
import AdvisingSession from '#modules/enrollment/models/advising_session'
import Section from '#modules/enrollment/models/section'
import Subject from '#modules/enrollment/models/subject'

export default class AdvisingRecommendation extends BaseModel {
  static table = t('advising_recommendations')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare advisingSessionId: string

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
  declare action: string

  @column()
  declare substitutesForSubjectId: string | null

  @column()
  declare notes: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  @belongsTo(() => AdvisingSession)
  declare advisingSession: BelongsTo<typeof AdvisingSession>

  @belongsTo(() => Subject)
  declare subject: BelongsTo<typeof Subject>

  @belongsTo(() => Section)
  declare section: BelongsTo<typeof Section>
}
