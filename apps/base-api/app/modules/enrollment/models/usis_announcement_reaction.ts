import { BaseModel, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'
import { t } from '#modules/enrollment/helpers/db_schema'

export default class UsisAnnouncementReaction extends BaseModel {
  static table = t('usis_announcement_reactions')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare announcementId: string

  @column()
  declare userId: string

  @column()
  declare kind: 'like' | 'comment'

  @column()
  declare body: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null
}
