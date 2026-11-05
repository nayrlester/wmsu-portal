import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { t } from '#modules/enrollment/helpers/db_schema'
import UsisStudentImportBatch from '#modules/enrollment/models/usis_student_import_batch'
import Student from '#modules/enrollment/models/student'

export default class UsisStudentImportAccepted extends BaseModel {
  static table = t('usis_student_import_accepted')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare batchId: string

  @column()
  declare rowNumber: number

  @column()
  declare studentId: string

  @column()
  declare studentNumber: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @belongsTo(() => UsisStudentImportBatch, { foreignKey: 'batchId' })
  declare batch: BelongsTo<typeof UsisStudentImportBatch>

  @belongsTo(() => Student)
  declare student: BelongsTo<typeof Student>
}
