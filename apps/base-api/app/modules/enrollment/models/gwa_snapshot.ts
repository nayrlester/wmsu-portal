import { BaseModel, column } from '@adonisjs/lucid/orm'
import { t } from '#modules/enrollment/helpers/db_schema'
import { DateTime } from 'luxon'

export default class GwaSnapshot extends BaseModel {
  static table = t('gwa_snapshots')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare studentId: string

  @column()
  declare academicYearId: string | null

  @column()
  declare semester: number | null

  @column()
  declare termGwa: number | null

  @column()
  declare cumulativeGwa: number | null

  @column()
  declare unitsEarned: number

  @column()
  declare unitsGraded: number

  @column()
  declare academicStanding: string | null

  @column.dateTime()
  declare asOf: DateTime

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
