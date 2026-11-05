import { t } from '#modules/library/helpers/db_schema'
import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class LibraryQueueTicket extends BaseModel {
  static table = t('library_queue_tickets')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare tenantId: string

  @column()
  declare ticketNumber: string

  @column()
  declare serviceType: string

  @column()
  declare status: string

  @column()
  declare memberId: string | null

  @column()
  declare patronName: string | null

  @column.dateTime()
  declare calledAt: DateTime | null

  @column.dateTime()
  declare completedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null
}
