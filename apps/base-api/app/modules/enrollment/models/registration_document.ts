import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { t } from '#modules/enrollment/helpers/db_schema'
import { DateTime } from 'luxon'
import Organization from '#modules/enrollment/models/organization'
import Enrollment from '#modules/enrollment/models/enrollment'
import Assessment from '#modules/enrollment/models/assessment'
import User from '#modules/enrollment/models/user'

export default class RegistrationDocument extends BaseModel {
  static table = t('registration_documents')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare enrollmentId: string

  @column()
  declare assessmentId: string | null

  @column()
  declare docType: string

  @column()
  declare documentNumber: string

  @column()
  declare qrToken: string

  @column()
  declare snapshot: Record<string, unknown>

  @column()
  declare issuedBy: string | null

  @column.dateTime()
  declare issuedAt: DateTime

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  @belongsTo(() => Enrollment)
  declare enrollment: BelongsTo<typeof Enrollment>

  @belongsTo(() => Assessment)
  declare assessment: BelongsTo<typeof Assessment>

  @belongsTo(() => User, { foreignKey: 'issuedBy' })
  declare issuer: BelongsTo<typeof User>
}
