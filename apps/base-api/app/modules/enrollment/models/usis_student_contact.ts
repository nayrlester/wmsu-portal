import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import { t } from '#modules/enrollment/helpers/db_schema'
import Organization from '#modules/enrollment/models/organization'
import Student from '#modules/enrollment/models/student'

export type StudentContactRelation = 'parent' | 'guardian' | 'sponsor' | string

export default class UsisStudentContact extends BaseModel {
  static table = t('usis_student_contacts')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare studentId: string

  @column()
  declare relation: StudentContactRelation

  @column()
  declare fullName: string

  @column()
  declare mobile: string | null

  @column()
  declare email: string | null

  @column()
  declare smsOptIn: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  @belongsTo(() => Student)
  declare student: BelongsTo<typeof Student>
}
