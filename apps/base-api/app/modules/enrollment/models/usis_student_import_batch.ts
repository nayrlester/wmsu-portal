import { DateTime } from 'luxon'
import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import { t } from '#modules/enrollment/helpers/db_schema'
import UsisStudentImportRejection from '#modules/enrollment/models/usis_student_import_rejection'
import UsisStudentImportAccepted from '#modules/enrollment/models/usis_student_import_accepted'

export type StudentImportBatchStatus = 'processing' | 'completed' | 'failed'

export default class UsisStudentImportBatch extends BaseModel {
  static table = t('usis_student_import_batches')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare sourceName: string

  @column()
  declare status: StudentImportBatchStatus

  @column()
  declare totalRows: number

  @column()
  declare acceptedCount: number

  @column()
  declare rejectedCount: number

  @column()
  declare createdBy: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime()
  declare completedAt: DateTime | null

  @hasMany(() => UsisStudentImportRejection, { foreignKey: 'batchId' })
  declare rejections: HasMany<typeof UsisStudentImportRejection>

  @hasMany(() => UsisStudentImportAccepted, { foreignKey: 'batchId' })
  declare accepted: HasMany<typeof UsisStudentImportAccepted>
}
