import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { t } from '#modules/enrollment/helpers/db_schema'
import UsisStudentImportBatch from '#modules/enrollment/models/usis_student_import_batch'

export default class UsisStudentImportRejection extends BaseModel {
  static table = t('usis_student_import_rejections')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare batchId: string

  @column()
  declare rowNumber: number

  @column({
    prepare: (value: Record<string, unknown>) => JSON.stringify(value ?? {}),
    consume: (value: string | Record<string, unknown>) =>
      typeof value === 'string' ? (JSON.parse(value) as Record<string, unknown>) : value ?? {},
  })
  declare payload: Record<string, unknown>

  @column()
  declare reason: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @belongsTo(() => UsisStudentImportBatch, { foreignKey: 'batchId' })
  declare batch: BelongsTo<typeof UsisStudentImportBatch>
}
