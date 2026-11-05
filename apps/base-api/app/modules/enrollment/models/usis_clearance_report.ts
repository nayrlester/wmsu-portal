import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import { t } from '#modules/enrollment/helpers/db_schema'
import Organization from '#modules/enrollment/models/organization'
import Student from '#modules/enrollment/models/student'
import User from '#modules/enrollment/models/user'

export type ClearanceReportSnapshot = {
  schemaVersion: string
  studentNumber: string
  studentName: string
  cleared: boolean
  generatedAt: string
  checks: Record<string, { cleared: boolean; openItems?: number; error?: boolean }>
}

export default class UsisClearanceReport extends BaseModel {
  static table = t('usis_clearance_reports')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare studentId: string

  @column()
  declare studentNumber: string

  @column()
  declare documentToken: string

  @column()
  declare snapshotChecksum: string

  @column({
    prepare: (value: ClearanceReportSnapshot) => JSON.stringify(value),
    consume: (value: string | ClearanceReportSnapshot) =>
      typeof value === 'string' ? (JSON.parse(value) as ClearanceReportSnapshot) : value,
  })
  declare snapshotJson: ClearanceReportSnapshot

  @column()
  declare cleared: boolean

  @column()
  declare issuedBy: string | null

  @column.dateTime()
  declare issuedAt: DateTime

  @column.dateTime()
  declare revokedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  @belongsTo(() => Student)
  declare student: BelongsTo<typeof Student>

  @belongsTo(() => User, { foreignKey: 'issuedBy' })
  declare issuer: BelongsTo<typeof User>
}
