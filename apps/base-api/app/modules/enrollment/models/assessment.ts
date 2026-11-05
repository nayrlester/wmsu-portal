import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { t } from '#modules/enrollment/helpers/db_schema'
import { DateTime } from 'luxon'
import Organization from '#modules/enrollment/models/organization'
import Enrollment from '#modules/enrollment/models/enrollment'
import User from '#modules/enrollment/models/user'

export default class Assessment extends BaseModel {
  static table = t('assessments')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare enrollmentId: string

  @column()
  declare assessmentNumber: string

  @column()
  declare tuitionFee: number

  @column()
  declare miscFees: number

  @column()
  declare totalAmount: number

  @column()
  declare discount: number

  @column()
  declare netAmount: number

  @column()
  declare feeScheduleId: string | null

  @column()
  declare status: string

  @column()
  declare ufmsAssessmentId: string | null

  @column()
  declare ufmsSyncStatus: string | null

  @column()
  declare ufmsPaymentStatus: string | null

  @column()
  declare paidAmount: number | null

  @column()
  declare balanceAmount: number | null

  @column()
  declare unifastTagged: boolean

  @column()
  declare version: number

  @column()
  declare breakdown: Record<string, unknown> | null

  @column.dateTime()
  declare submittedToUfmsAt: DateTime | null

  @column()
  declare lastIdempotencyKey: string | null

  @column.dateTime()
  declare assessedAt: DateTime

  @column()
  declare assessedBy: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  @belongsTo(() => Enrollment)
  declare enrollment: BelongsTo<typeof Enrollment>

  @belongsTo(() => User, { foreignKey: 'assessedBy' })
  declare assessor: BelongsTo<typeof User>
}
