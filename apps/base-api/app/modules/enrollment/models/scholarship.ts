import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { t } from '#modules/enrollment/helpers/db_schema'
import { DateTime } from 'luxon'
import Organization from '#modules/enrollment/models/organization'
import Student from '#modules/enrollment/models/student'

export default class Scholarship extends BaseModel {
  static table = t('scholarships')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare studentId: string

  @column()
  declare scholarshipCode: string

  @column()
  declare name: string

  @column()
  declare amount: number

  @column()
  declare status: string

  @column()
  declare programId: string | null

  @column()
  declare applicationId: string | null

  @column()
  declare academicYearId: string | null

  @column()
  declare semester: number | null

  @column()
  declare awardStatus: string | null

  @column.dateTime()
  declare awardedAt: DateTime

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  @belongsTo(() => Student)
  declare student: BelongsTo<typeof Student>
}
