import { t } from '#modules/library/helpers/db_schema'
import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class CatalogRecordVersion extends BaseModel {
  static table = t('catalog_record_versions')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare tenantId: string

  @column()
  declare bookId: string

  @column()
  declare version: number

  @column()
  declare snapshot: Record<string, unknown>

  @column()
  declare changedBy: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime
}
