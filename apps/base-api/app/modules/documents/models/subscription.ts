import { t } from '#modules/documents/helpers/db_schema'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import Tenant from '#modules/documents/models/tenant'
import Plan from '#modules/documents/models/plan'

export default class Subscription extends BaseModel {
  static table = t('subscriptions')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare tenantId: string

  @column()
  declare planId: string

  @column()
  declare status: string

  @column()
  declare billingCycle: string

  @column()
  declare stripeSubscriptionId: string | null

  @column()
  declare paymongoSubscriptionId: string | null

  @column()
  declare billingProvider: string | null

  @column()
  declare couponId: string | null

  @column()
  declare pendingPlanId: string | null

  @column()
  declare pendingBillingCycle: string | null

  @column.dateTime()
  declare trialEndsAt: DateTime | null

  @column.dateTime()
  declare currentPeriodStart: DateTime | null

  @column.dateTime()
  declare currentPeriodEnd: DateTime | null

  @column.dateTime()
  declare cancelledAt: DateTime | null

  @column.dateTime()
  declare deletedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => Tenant)
  declare tenant: BelongsTo<typeof Tenant>

  @belongsTo(() => Plan)
  declare plan: BelongsTo<typeof Plan>
}
