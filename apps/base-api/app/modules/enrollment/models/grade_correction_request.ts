import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import { t } from '#modules/enrollment/helpers/db_schema'
import { DateTime } from 'luxon'
import GradeEntry from '#modules/enrollment/models/grade_entry'
import GradeCorrectionApproval from '#modules/enrollment/models/grade_correction_approval'

export default class GradeCorrectionRequest extends BaseModel {
  static table = t('grade_correction_requests')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare gradeEntryId: string

  @column()
  declare classRecordId: string

  @column()
  declare requestedBy: string

  @column()
  declare reasonCode: string

  @column()
  declare reasonNotes: string | null

  @column({
    prepare: (value: unknown) => (value == null ? null : JSON.stringify(value)),
    consume: (value: string | unknown) => (typeof value === 'string' ? JSON.parse(value) : value),
  })
  declare supportingDocumentRefs: string[] | null

  @column()
  declare proposedMarkCode: string

  @column()
  declare proposedNumericGrade: number | null

  @column()
  declare priorMarkCode: string | null

  @column()
  declare priorNumericGrade: number | null

  @column()
  declare status: string

  @column()
  declare currentLevel: number

  @column()
  declare requiredLevels: number

  @column.dateTime()
  declare decidedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => GradeEntry)
  declare gradeEntry: BelongsTo<typeof GradeEntry>

  @hasMany(() => GradeCorrectionApproval, { foreignKey: 'requestId' })
  declare approvals: HasMany<typeof GradeCorrectionApproval>
}
