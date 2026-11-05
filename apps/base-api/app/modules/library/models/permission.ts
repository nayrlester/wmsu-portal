import { BaseModel, column } from '@adonisjs/lucid/orm'
import { t } from '#modules/library/helpers/db_schema'

export default class Permission extends BaseModel {
  static table = t('permissions')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare code: string

  @column()
  declare resource: string

  @column()
  declare action: string

  @column()
  declare description: string | null
}
