import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import { t } from '#modules/enrollment/helpers/db_schema'
import { DateTime } from 'luxon'
import Organization from '#modules/enrollment/models/organization'
import Student from '#modules/enrollment/models/student'
import AcademicYear from '#modules/enrollment/models/academic_year'
import Section from '#modules/enrollment/models/section'
import User from '#modules/enrollment/models/user'
import Assessment from '#modules/enrollment/models/assessment'

export default class Enrollment extends BaseModel {
  static table = t('enrollments')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare studentId: string

  @column()
  declare academicYearId: string

  @column()
  declare sectionId: string | null

  @column()
  declare yearLevel: number

  @column()
  declare semester: number

  @column()
  declare status: string

  @column()
  declare classification: string | null

  @column()
  declare isRegularBlock: boolean

  @column()
  declare advisingWaived: boolean

  @column()
  declare advisingWaiverId: string | null

  @column()
  declare paymentVerified: boolean

  @column.dateTime()
  declare paymentVerifiedAt: DateTime | null

  @column()
  declare paymentVerifiedBy: string | null

  @column()
  declare requiresReadvising: boolean

  @column()
  declare requiresReassessment: boolean

  @column()
  declare approvedUnits: number | null

  @column()
  declare rejectionReason: string | null

  @column()
  declare validationSnapshot: Record<string, unknown> | null

  @column.dateTime()
  declare advisedAt: DateTime | null

  @column()
  declare advisedBy: string | null

  @column()
  declare advisedCurriculumId: string | null

  @column({
    prepare: (value: string[] | null) => (value == null ? null : JSON.stringify(value)),
    consume: (value: string[] | string | null) => {
      if (value == null) return null
      return typeof value === 'string' ? (JSON.parse(value) as string[]) : value
    },
  })
  declare advisedCurriculumIds: string[] | null

  @column()
  declare curriculumId: string | null

  @column.dateTime()
  declare assessedAt: DateTime | null

  @column.dateTime()
  declare registrarApprovedAt: DateTime | null

  @column()
  declare registrarApprovedBy: string | null

  @column.dateTime()
  declare registeredAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  @belongsTo(() => Student)
  declare student: BelongsTo<typeof Student>

  @belongsTo(() => AcademicYear)
  declare academicYear: BelongsTo<typeof AcademicYear>

  @belongsTo(() => Section)
  declare section: BelongsTo<typeof Section>

  @belongsTo(() => User, { foreignKey: 'advisedBy' })
  declare adviser: BelongsTo<typeof User>

  @hasMany(() => Assessment)
  declare assessments: HasMany<typeof Assessment>
}
