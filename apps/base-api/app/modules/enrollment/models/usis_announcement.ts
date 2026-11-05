import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import { t } from '#modules/enrollment/helpers/db_schema'
import Organization from '#modules/enrollment/models/organization'
import User from '#modules/enrollment/models/user'

export type AnnouncementAudience = {
  roles?: string[]
  programIds?: string[]
  yearLevels?: number[]
  educationalLevels?: string[]
  departmentCodes?: string[]
  sectionCodes?: string[]
}

export default class UsisAnnouncement extends BaseModel {
  static table = t('usis_announcements')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare title: string

  @column()
  declare body: string

  @column()
  declare status: string

  @column({
    prepare: (value: AnnouncementAudience) => JSON.stringify(value ?? {}),
    consume: (value: string | AnnouncementAudience) =>
      typeof value === 'string' ? (JSON.parse(value) as AnnouncementAudience) : value,
  })
  declare audience: AnnouncementAudience

  @column()
  declare isPinned: boolean

  @column.dateTime()
  declare publishAt: DateTime | null

  @column.dateTime()
  declare expiresAt: DateTime | null

  @column()
  declare deliverPortal: boolean

  @column()
  declare deliverEmail: boolean

  @column()
  declare deliverSms: boolean

  @column()
  declare createdBy: string | null

  @column()
  declare updatedBy: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  @belongsTo(() => User, { foreignKey: 'createdBy' })
  declare author: BelongsTo<typeof User>
}
