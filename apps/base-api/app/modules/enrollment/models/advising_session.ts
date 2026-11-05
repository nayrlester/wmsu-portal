import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import { t } from '#modules/enrollment/helpers/db_schema'
import { DateTime } from 'luxon'
import Organization from '#modules/enrollment/models/organization'
import Enrollment from '#modules/enrollment/models/enrollment'
import User from '#modules/enrollment/models/user'
import AdvisingRecommendation from '#modules/enrollment/models/advising_recommendation'

export default class AdvisingSession extends BaseModel {
  static table = t('advising_sessions')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare enrollmentId: string

  @column()
  declare adviserUserId: string

  @column()
  declare mode: string

  @column()
  declare status: string

  @column()
  declare onBehalf: boolean

  @column()
  declare approvedUnits: number | null

  @column()
  declare overloadApproved: boolean

  @column()
  declare underloadApproved: boolean

  @column()
  declare remarks: string | null

  @column()
  declare curriculumEvaluation: Record<string, unknown> | null

  @column.dateTime()
  declare endorsedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  @belongsTo(() => Enrollment)
  declare enrollment: BelongsTo<typeof Enrollment>

  @belongsTo(() => User, { foreignKey: 'adviserUserId' })
  declare adviser: BelongsTo<typeof User>

  @hasMany(() => AdvisingRecommendation)
  declare recommendations: HasMany<typeof AdvisingRecommendation>
}
