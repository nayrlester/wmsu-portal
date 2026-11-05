import { t } from '#modules/documents/helpers/db_schema'
import { BaseModel, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'

export default class Coupon extends BaseModel {
  static table = t('coupons')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare code: string

  @column()
  declare discountType: string

  @column()
  declare discountValue: number

  @column()
  declare maxUses: number | null

  @column()
  declare usedCount: number

  @column.dateTime()
  declare expiresAt: DateTime | null

  @column()
  declare isActive: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime
}
