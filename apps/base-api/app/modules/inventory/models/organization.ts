import { BaseModel, column } from '@adonisjs/lucid/orm'
import { t } from '#modules/inventory/helpers/db_schema'
import { DateTime } from 'luxon'

export default class Organization extends BaseModel {
  static table = t('organizations')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare name: string

  @column()
  declare code: string

  @column()
  declare platformOrganizationId: string | null

  @column()
  declare address: string | null

  @column()
  declare contactEmail: string | null

  @column()
  declare contactPhone: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
