import { BaseModel, column } from '@adonisjs/lucid/orm'
import { t } from '#modules/enrollment/helpers/db_schema'
import { DateTime } from 'luxon'

export default class GradeDeadline extends BaseModel {
  static table = t('grade_deadlines')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare academicYearId: string

  @column()
  declare semester: number

  @column.dateTime()
  declare encodeOpensAt: DateTime | null

  @column.dateTime()
  declare encodeClosesAt: DateTime | null

  @column.dateTime()
  declare submitDeadlineAt: DateTime | null

  @column()
  declare setBy: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
