import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { t } from '#modules/enrollment/helpers/db_schema'
import { DateTime } from 'luxon'
import FeeSchedule from '#modules/enrollment/models/fee_schedule'
import Organization from '#modules/enrollment/models/organization'

export default class FeeScheduleLine extends BaseModel {
  static table = t('fee_schedule_lines')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare feeScheduleId: string

  @column()
  declare feeCode: string

  @column()
  declare description: string

  @column()
  declare feeType: string

  @column()
  declare calculationMethod: string

  @column()
  declare amount: number

  @column()
  declare subjectCode: string | null

  @column()
  declare priority: number

  @column()
  declare isActive: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  @belongsTo(() => FeeSchedule)
  declare feeSchedule: BelongsTo<typeof FeeSchedule>
}
