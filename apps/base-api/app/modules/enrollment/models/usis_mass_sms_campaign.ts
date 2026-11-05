import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import { t } from '#modules/enrollment/helpers/db_schema'
import Organization from '#modules/enrollment/models/organization'
import User from '#modules/enrollment/models/user'

export type MassSmsRecipientKind = 'student' | 'parent' | 'guardian' | 'sponsor'

export type MassSmsFilters = {
  yearLevels?: number[]
  educationalLevels?: string[]
  departmentCodes?: string[]
  programIds?: string[]
  sectionCodes?: string[]
}

export default class UsisMassSmsCampaign extends BaseModel {
  static table = t('usis_mass_sms_campaigns')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare title: string

  @column()
  declare message: string

  @column({
    prepare: (value: MassSmsFilters) => JSON.stringify(value ?? {}),
    consume: (value: string | MassSmsFilters) =>
      typeof value === 'string' ? (JSON.parse(value) as MassSmsFilters) : value,
  })
  declare filters: MassSmsFilters

  @column({
    prepare: (value: MassSmsRecipientKind[]) => JSON.stringify(value ?? ['student']),
    consume: (value: string | MassSmsRecipientKind[]) =>
      typeof value === 'string' ? (JSON.parse(value) as MassSmsRecipientKind[]) : value,
  })
  declare recipientKinds: MassSmsRecipientKind[]

  @column()
  declare status: string

  @column()
  declare recipientCount: number

  @column()
  declare deliveryMode: string

  @column()
  declare lastError: string | null

  @column()
  declare announcementId: string | null

  @column()
  declare requestedBy: string | null

  @column.dateTime()
  declare queuedAt: DateTime

  @column.dateTime()
  declare completedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  @belongsTo(() => User, { foreignKey: 'requestedBy' })
  declare requester: BelongsTo<typeof User>
}
