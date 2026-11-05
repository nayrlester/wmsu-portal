import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { t } from '#modules/enrollment/helpers/db_schema'
import Subject from '#modules/enrollment/models/subject'
import Student from '#modules/enrollment/models/student'

export type SubjectCreditType = 'internal' | 'external' | 'equivalent'
export type SubjectCreditStatus = 'pending' | 'credited' | 'rejected'

export default class StudentSubjectCredit extends BaseModel {
  static table = t('student_subject_credits')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare studentId: string

  @column()
  declare subjectId: string | null

  @column()
  declare subjectCode: string

  @column()
  declare subjectTitle: string

  @column({
    prepare: (value: number) => value,
    consume: (value: string | number) => Number(value),
  })
  declare units: number

  @column()
  declare creditType: SubjectCreditType

  @column()
  declare sourceSchool: string | null

  @column()
  declare status: SubjectCreditStatus

  @column()
  declare externalSubjectCode: string | null

  @column()
  declare externalSubjectTitle: string | null

  @column()
  declare notes: string | null

  @column()
  declare reviewedBy: string | null

  @column.dateTime()
  declare reviewedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => Student)
  declare student: BelongsTo<typeof Student>

  @belongsTo(() => Subject)
  declare subject: BelongsTo<typeof Subject>
}
