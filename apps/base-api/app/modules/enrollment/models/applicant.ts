import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { t } from '#modules/enrollment/helpers/db_schema'
import { DateTime } from 'luxon'
import Organization from '#modules/enrollment/models/organization'
import Program from '#modules/enrollment/models/program'

export default class Applicant extends BaseModel {
  static table = t('applicants')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare applicationNumber: string

  @column()
  declare firstName: string

  @column()
  declare middleName: string | null

  @column()
  declare lastName: string

  @column()
  declare email: string

  @column()
  declare mobile: string | null

  @column.date()
  declare birthDate: DateTime | null

  @column()
  declare programId: string | null

  @column()
  declare status: string

  @column()
  declare classification: string | null

  @column()
  declare mdmCampusId: string | null

  @column()
  declare formConfigId: string | null

  @column({
    prepare: (value: Record<string, unknown>) => JSON.stringify(value ?? {}),
    consume: (value: string | Record<string, unknown>) =>
      typeof value === 'string' ? (JSON.parse(value) as Record<string, unknown>) : value ?? {},
  })
  declare formAnswers: Record<string, unknown>

  @column({
    prepare: (value: Record<string, unknown>) => JSON.stringify(value ?? {}),
    consume: (value: string | Record<string, unknown>) =>
      typeof value === 'string' ? (JSON.parse(value) as Record<string, unknown>) : value ?? {},
  })
  declare surveyAnswers: Record<string, unknown>

  @column.dateTime()
  declare termsAcceptedAt: DateTime | null

  @column.dateTime()
  declare privacyConsentAt: DateTime | null

  @column()
  declare privacyConsentVersion: string | null

  @column.dateTime()
  declare appliedAt: DateTime

  @column.dateTime()
  declare admittedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  @belongsTo(() => Program)
  declare program: BelongsTo<typeof Program>
}
