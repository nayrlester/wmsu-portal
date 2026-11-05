import { BaseModel, column } from '@adonisjs/lucid/orm'
import { t } from '#modules/enrollment/helpers/db_schema'
import { DateTime } from 'luxon'

export default class UnitLoadPolicy extends BaseModel {
  static table = t('unit_load_policies')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare programId: string | null

  @column()
  declare yearLevel: number | null

  @column()
  declare minUnits: number

  @column()
  declare maxUnits: number

  @column()
  declare overloadMaxUnits: number | null

  @column()
  declare isActive: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
