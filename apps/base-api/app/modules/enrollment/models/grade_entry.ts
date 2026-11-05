import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { t } from '#modules/enrollment/helpers/db_schema'
import { DateTime } from 'luxon'
import Organization from '#modules/enrollment/models/organization'
import Enrollment from '#modules/enrollment/models/enrollment'
import User from '#modules/enrollment/models/user'
import ClassRecord from '#modules/enrollment/models/class_record'
import Student from '#modules/enrollment/models/student'

export default class GradeEntry extends BaseModel {
  static table = t('grade_entries')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare enrollmentId: string

  @column()
  declare classRecordId: string | null

  @column()
  declare studentId: string | null

  @column()
  declare enrollmentLineId: string | null

  @column()
  declare courseCode: string

  @column()
  declare courseTitle: string

  @column()
  declare units: number

  @column()
  declare grade: number | null

  @column()
  declare markCode: string | null

  @column()
  declare numericGrade: number | null

  @column()
  declare rawScore: number | null

  @column()
  declare remarks: string | null

  @column()
  declare autoRemark: string | null

  @column()
  declare status: string

  @column.dateTime()
  declare enteredAt: DateTime | null

  @column()
  declare enteredBy: string | null

  @column.dateTime()
  declare submittedAt: DateTime | null

  @column()
  declare submittedBy: string | null

  @column.dateTime()
  declare lockedAt: DateTime | null

  @column()
  declare lockedBy: string | null

  @column()
  declare originalMarkCode: string | null

  @column()
  declare originalNumericGrade: number | null

  @column.dateTime()
  declare incMarkedAt: DateTime | null

  @column()
  declare incConverted: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  @belongsTo(() => Enrollment)
  declare enrollment: BelongsTo<typeof Enrollment>

  @belongsTo(() => ClassRecord)
  declare classRecord: BelongsTo<typeof ClassRecord>

  @belongsTo(() => Student)
  declare student: BelongsTo<typeof Student>

  @belongsTo(() => User, { foreignKey: 'submittedBy' })
  declare submitter: BelongsTo<typeof User>
}
