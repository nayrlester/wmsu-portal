import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import { t } from '#modules/enrollment/helpers/db_schema'
import Organization from '#modules/enrollment/models/organization'
import Section from '#modules/enrollment/models/section'
import User from '#modules/enrollment/models/user'

export default class UsisSectionMeeting extends BaseModel {
  static table = t('usis_section_meetings')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare sectionId: string

  @column()
  declare dayOfWeek: number

  @column()
  declare startMinute: number

  @column()
  declare endMinute: number

  @column()
  declare roomCode: string | null

  @column()
  declare facultyUserId: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  @belongsTo(() => Section)
  declare section: BelongsTo<typeof Section>

  @belongsTo(() => User, { foreignKey: 'facultyUserId' })
  declare faculty: BelongsTo<typeof User>
}
