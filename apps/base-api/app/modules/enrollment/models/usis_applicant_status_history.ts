import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { t } from '#modules/enrollment/helpers/db_schema'
import Organization from '#modules/enrollment/models/organization'
import Applicant from '#modules/enrollment/models/applicant'

export default class UsisApplicantStatusHistory extends BaseModel {
  static table = t('usis_applicant_status_history')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare applicantId: string

  @column()
  declare fromStatus: string | null

  @column()
  declare toStatus: string

  @column()
  declare note: string | null

  @column()
  declare actorUserId: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  @belongsTo(() => Applicant)
  declare applicant: BelongsTo<typeof Applicant>
}
