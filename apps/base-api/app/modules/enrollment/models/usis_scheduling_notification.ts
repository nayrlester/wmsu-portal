import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import { t } from '#modules/enrollment/helpers/db_schema'
import Organization from '#modules/enrollment/models/organization'
import Section from '#modules/enrollment/models/section'
import Student from '#modules/enrollment/models/student'
import User from '#modules/enrollment/models/user'

export default class UsisSchedulingNotification extends BaseModel {
  static table = t('usis_scheduling_notifications')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare sectionId: string | null

  @column()
  declare studentId: string | null

  @column()
  declare facultyUserId: string | null

  @column()
  declare eventType: string

  @column()
  declare title: string

  @column()
  declare body: string

  @column.dateTime()
  declare readAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  @belongsTo(() => Section)
  declare section: BelongsTo<typeof Section>

  @belongsTo(() => Student)
  declare student: BelongsTo<typeof Student>

  @belongsTo(() => User, { foreignKey: 'facultyUserId' })
  declare faculty: BelongsTo<typeof User>
}
