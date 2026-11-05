import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { t } from '#modules/enrollment/helpers/db_schema'
import { DateTime } from 'luxon'
import Organization from '#modules/enrollment/models/organization'
import AcademicYear from '#modules/enrollment/models/academic_year'
import Program from '#modules/enrollment/models/program'

export default class Section extends BaseModel {
  static table = t('sections')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare academicYearId: string

  @column()
  declare programId: string

  @column()
  declare code: string

  @column()
  declare name: string

  @column()
  declare yearLevel: number

  @column()
  declare semester: number

  @column()
  declare capacity: number | null

  @column()
  declare isBlockSection: boolean

  @column()
  declare blockGroupCode: string | null

  @column()
  declare subjectId: string | null

  @column()
  declare status: string

  @column()
  declare enrolledCount: number

  @column()
  declare waitlistEnabled: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  @belongsTo(() => AcademicYear)
  declare academicYear: BelongsTo<typeof AcademicYear>

  @belongsTo(() => Program)
  declare program: BelongsTo<typeof Program>
}
