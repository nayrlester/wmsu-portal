import { t } from '#modules/library/helpers/db_schema'
import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class CirculationEvent extends BaseModel {
  static table = t('circulation_events')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare tenantId: string

  @column()
  declare borrowingId: string | null

  @column()
  declare bookId: string | null

  @column()
  declare copyId: string | null

  @column()
  declare memberId: string | null

  @column()
  declare eventType: string

  @column()
  declare channel: string

  @column()
  declare actorUserId: string | null

  @column()
  declare payload: Record<string, unknown>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime
}
