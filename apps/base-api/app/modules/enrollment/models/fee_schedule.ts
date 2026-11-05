import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { t } from '#modules/enrollment/helpers/db_schema'
import { DateTime } from 'luxon'
import Organization from '#modules/enrollment/models/organization'
import AcademicYear from '#modules/enrollment/models/academic_year'

import Program from '#modules/enrollment/models/program'

export default class FeeSchedule extends BaseModel {
  static table = t('fee_schedules')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare academicYearId: string | null

  @column()
  declare semester: number | null

  @column()
  declare code: string

  @column()
  declare name: string

  @column()
  declare classification: string | null

  @column()
  declare programId: string | null

  @column()
  declare isActive: boolean

  @column()
  declare approvedByRole: string | null

  @column.dateTime()
  declare effectiveFrom: DateTime | null

  @column.dateTime()
  declare effectiveTo: DateTime | null

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
