import { BaseModel, column } from '@adonisjs/lucid/orm'
import { t } from '#modules/enrollment/helpers/db_schema'
import { DateTime } from 'luxon'

export default class Subject extends BaseModel {
  static table = t('subjects')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare subjectCode: string

  @column()
  declare title: string

  @column()
  declare units: number

  @column()
  declare lectureHours: number | null

  @column()
  declare laboratoryHours: number | null

  @column()
  declare programId: string | null

  @column()
  declare isActive: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
