import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { t } from '#modules/enrollment/helpers/db_schema'
import { DateTime } from 'luxon'
import Organization from '#modules/enrollment/models/organization'
import Assessment from '#modules/enrollment/models/assessment'

export default class AssessmentLine extends BaseModel {
  static table = t('assessment_lines')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare assessmentId: string

  @column()
  declare feeCode: string

  @column()
  declare description: string

  @column()
  declare feeType: string

  @column()
  declare quantity: number

  @column()
  declare unitAmount: number

  @column()
  declare amount: number

  @column()
  declare isAid: boolean

  @column()
  declare aidSource: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  @belongsTo(() => Assessment)
  declare assessment: BelongsTo<typeof Assessment>
}
