import { t } from '#modules/documents/helpers/db_schema'
import { BaseModel, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'

export default class BillingCustomer extends BaseModel {
  static table = t('billing_customers')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare tenantId: string

  @column()
  declare provider: string

  @column()
  declare providerCustomerId: string

  @column()
  declare billingEmail: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null
}
