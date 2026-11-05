import { t } from '#modules/documents/helpers/db_schema'
import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import Subscription from '#modules/documents/models/subscription'

export default class Plan extends BaseModel {
  static table = t('plans')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare name: string

  @column()
  declare slug: string

  @column()
  declare description: string | null

  @column()
  declare monthlyPrice: number

  @column()
  declare annualPrice: number

  @column()
  declare currency: string

  @column()
  declare maxUsers: number | null

  @column()
  declare maxDocuments: number | null

  @column()
  declare maxStorageBytes: number | null

  @column()
  declare features: Record<string, unknown> | null

  @column()
  declare isActive: boolean

  @column()
  declare stripePriceIdMonthly: string | null

  @column()
  declare stripePriceIdAnnual: string | null

  @column()
  declare paymongoPlanIdMonthly: string | null

  @column()
  declare paymongoPlanIdAnnual: string | null

  @column()
  declare sortOrder: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @hasMany(() => Subscription)
  declare subscriptions: HasMany<typeof Subscription>
}
