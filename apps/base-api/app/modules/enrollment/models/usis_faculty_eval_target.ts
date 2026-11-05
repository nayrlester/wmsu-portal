import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import { t } from '#modules/enrollment/helpers/db_schema'
import Organization from '#modules/enrollment/models/organization'
import UsisFacultyEvalSchedule from '#modules/enrollment/models/usis_faculty_eval_schedule'
import Section from '#modules/enrollment/models/section'
import User from '#modules/enrollment/models/user'

export default class UsisFacultyEvalTarget extends BaseModel {
  static table = t('usis_faculty_eval_targets')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare scheduleId: string

  @column()
  declare facultyUserId: string

  @column()
  declare sectionId: string | null

  @column()
  declare subjectCode: string | null

  @column()
  declare subjectTitle: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  @belongsTo(() => UsisFacultyEvalSchedule, { foreignKey: 'scheduleId' })
  declare schedule: BelongsTo<typeof UsisFacultyEvalSchedule>

  @belongsTo(() => User, { foreignKey: 'facultyUserId' })
  declare faculty: BelongsTo<typeof User>

  @belongsTo(() => Section)
  declare section: BelongsTo<typeof Section>
}
