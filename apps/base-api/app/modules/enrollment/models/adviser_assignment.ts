import { BaseModel, column } from '@adonisjs/lucid/orm'
import { t } from '#modules/enrollment/helpers/db_schema'
import { DateTime } from 'luxon'

export default class AdviserAssignment extends BaseModel {
  static table = t('adviser_assignments')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare adviserUserId: string

  @column()
  declare programId: string | null

  @column()
  declare yearLevel: number | null

  @column()
  declare sectionId: string | null

  @column()
  declare studentId: string | null

  @column()
  declare delegateUserId: string | null

  @column()
  declare isActive: boolean

  @column.dateTime()
  declare effectiveFrom: DateTime

  @column.dateTime()
  declare effectiveTo: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
