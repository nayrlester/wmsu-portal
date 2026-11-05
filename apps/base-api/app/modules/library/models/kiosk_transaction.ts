import { t } from '#modules/library/helpers/db_schema'
import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import KioskDevice from '#modules/library/models/kiosk_device'
import Member from '#modules/library/models/member'

export default class KioskTransaction extends BaseModel {
  static table = t('kiosk_transactions')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare tenantId: string

  @column()
  declare kioskDeviceId: string

  @column()
  declare memberId: string | null

  @column()
  declare action: string

  @column()
  declare payload: Record<string, unknown> | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @belongsTo(() => KioskDevice)
  declare kioskDevice: BelongsTo<typeof KioskDevice>

  @belongsTo(() => Member)
  declare member: BelongsTo<typeof Member>
}
