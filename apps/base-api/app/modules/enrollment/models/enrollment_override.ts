import { BaseModel, column } from '@adonisjs/lucid/orm'
import { t } from '#modules/enrollment/helpers/db_schema'
import { DateTime } from 'luxon'

export default class EnrollmentOverride extends BaseModel {
  static table = t('enrollment_overrides')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare enrollmentId: string

  @column()
  declare overrideType: string

  @column()
  declare reason: string

  @column()
  declare authorizedBy: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime
}
