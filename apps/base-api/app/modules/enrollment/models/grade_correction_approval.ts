import { BaseModel, column } from '@adonisjs/lucid/orm'
import { t } from '#modules/enrollment/helpers/db_schema'
import { DateTime } from 'luxon'

export default class GradeCorrectionApproval extends BaseModel {
  static table = t('grade_correction_approvals')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare requestId: string

  @column()
  declare level: number

  @column()
  declare actorUserId: string

  @column()
  declare decision: string

  @column()
  declare notes: string | null

  @column.dateTime()
  declare decidedAt: DateTime

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
