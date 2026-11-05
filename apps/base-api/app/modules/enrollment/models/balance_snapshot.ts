import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { t } from '#modules/enrollment/helpers/db_schema'
import { DateTime } from 'luxon'
import Organization from '#modules/enrollment/models/organization'
import Student from '#modules/enrollment/models/student'
import Enrollment from '#modules/enrollment/models/enrollment'
import Assessment from '#modules/enrollment/models/assessment'

export default class BalanceSnapshot extends BaseModel {
  static table = t('balance_snapshots')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare studentId: string

  @column()
  declare enrollmentId: string | null

  @column()
  declare assessmentId: string | null

  @column()
  declare assessedAmount: number

  @column()
  declare paidAmount: number

  @column()
  declare balanceAmount: number

  @column()
  declare source: string

  @column()
  declare ufmsAssessmentId: string | null

  @column.dateTime()
  declare asOf: DateTime

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  @belongsTo(() => Student)
  declare student: BelongsTo<typeof Student>

  @belongsTo(() => Enrollment)
  declare enrollment: BelongsTo<typeof Enrollment>

  @belongsTo(() => Assessment)
  declare assessment: BelongsTo<typeof Assessment>
}
