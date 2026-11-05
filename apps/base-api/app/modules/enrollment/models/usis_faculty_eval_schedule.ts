import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import { t } from '#modules/enrollment/helpers/db_schema'
import Organization from '#modules/enrollment/models/organization'
import UsisFacultyEvalCode from '#modules/enrollment/models/usis_faculty_eval_code'
import UsisFacultyEvalTarget from '#modules/enrollment/models/usis_faculty_eval_target'
import User from '#modules/enrollment/models/user'

export default class UsisFacultyEvalSchedule extends BaseModel {
  static table = t('usis_faculty_eval_schedules')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare evalCodeId: string

  @column()
  declare title: string

  @column()
  declare status: string

  @column({
    prepare: (value: string[]) => JSON.stringify(value ?? []),
    consume: (value: string | string[]) => (typeof value === 'string' ? (JSON.parse(value) as string[]) : value),
  })
  declare questionIds: string[]

  @column.dateTime()
  declare opensAt: DateTime | null

  @column.dateTime()
  declare closesAt: DateTime | null

  @column()
  declare createdBy: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  @belongsTo(() => UsisFacultyEvalCode, { foreignKey: 'evalCodeId' })
  declare evalCode: BelongsTo<typeof UsisFacultyEvalCode>

  @belongsTo(() => User, { foreignKey: 'createdBy' })
  declare creator: BelongsTo<typeof User>

  @hasMany(() => UsisFacultyEvalTarget, { foreignKey: 'scheduleId' })
  declare targets: HasMany<typeof UsisFacultyEvalTarget>
}
