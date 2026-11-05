import { BaseModel, column } from '@adonisjs/lucid/orm'
import { t } from '#modules/enrollment/helpers/db_schema'
import { DateTime } from 'luxon'

export default class AttendanceRecord extends BaseModel {
  static table = t('attendance_records')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare classRecordId: string

  @column()
  declare studentId: string

  @column.date()
  declare sessionDate: DateTime

  @column()
  declare status: string

  @column()
  declare notes: string | null

  @column()
  declare recordedBy: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
