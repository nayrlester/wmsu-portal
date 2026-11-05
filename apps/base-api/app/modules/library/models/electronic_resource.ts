import { t } from '#modules/library/helpers/db_schema'
import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class ElectronicResource extends BaseModel {
  static table = t('electronic_resources')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare tenantId: string

  @column()
  declare title: string

  @column()
  declare resourceKind: string

  @column()
  declare provider: string | null

  @column()
  declare accessUrl: string | null

  @column()
  declare authMethod: string

  @column()
  declare ipRanges: string[] | null

  @column()
  declare metadata: Record<string, unknown> | null

  @column()
  declare isActive: boolean

  @column()
  declare viewCount: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null
}
