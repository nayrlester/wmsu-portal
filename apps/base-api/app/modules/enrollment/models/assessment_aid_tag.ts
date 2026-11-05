import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { t } from '#modules/enrollment/helpers/db_schema'
import { DateTime } from 'luxon'
import Organization from '#modules/enrollment/models/organization'
import Student from '#modules/enrollment/models/student'
import Enrollment from '#modules/enrollment/models/enrollment'
import User from '#modules/enrollment/models/user'

export default class AssessmentAidTag extends BaseModel {
  static table = t('assessment_aid_tags')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare studentId: string

  @column()
  declare enrollmentId: string | null

  @column()
  declare tagType: string

  @column()
  declare code: string

  @column()
  declare name: string

  @column()
  declare calculationMethod: string

  @column()
  declare value: number

  @column()
  declare unifast: boolean

  @column()
  declare status: string

  @column()
  declare notes: string | null

  @column()
  declare taggedBy: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  @belongsTo(() => Student)
  declare student: BelongsTo<typeof Student>

  @belongsTo(() => Enrollment)
  declare enrollment: BelongsTo<typeof Enrollment>

  @belongsTo(() => User, { foreignKey: 'taggedBy' })
  declare tagger: BelongsTo<typeof User>
}
