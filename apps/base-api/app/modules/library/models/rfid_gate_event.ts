import { t } from '#modules/library/helpers/db_schema'
import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class RfidGateEvent extends BaseModel {
  static table = t('rfid_gate_events')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare tenantId: string

  @column()
  declare gateCode: string

  @column()
  declare tagUid: string

  @column()
  declare copyId: string | null

  @column()
  declare result: string

  @column()
  declare reason: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime
}
