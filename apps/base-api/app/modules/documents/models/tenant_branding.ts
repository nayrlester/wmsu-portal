import { t } from '#modules/documents/helpers/db_schema'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import Tenant from '#modules/documents/models/tenant'

export default class TenantBranding extends BaseModel {
  static table = t('tenant_branding')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare tenantId: string

  @column()
  declare logoUrl: string | null

  @column()
  declare faviconUrl: string | null

  @column()
  declare primaryColor: string | null

  @column()
  declare secondaryColor: string | null

  @column()
  declare loginBackgroundUrl: string | null

  @column()
  declare customCss: Record<string, unknown> | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => Tenant)
  declare tenant: BelongsTo<typeof Tenant>
}
