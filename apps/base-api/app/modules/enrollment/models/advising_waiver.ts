import { BaseModel, column } from '@adonisjs/lucid/orm'
import { t } from '#modules/enrollment/helpers/db_schema'
import { DateTime } from 'luxon'

export default class AdvisingWaiver extends BaseModel {
  static table = t('advising_waivers')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare enrollmentId: string

  @column()
  declare authorizedBy: string

  @column()
  declare authorityRole: string

  @column()
  declare reason: string | null

  @column.dateTime()
  declare effectiveFrom: DateTime

  @column.dateTime()
  declare effectiveTo: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime
}
