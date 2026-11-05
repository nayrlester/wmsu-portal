import { BaseModel, column } from '@adonisjs/lucid/orm'
import { t } from '#modules/enrollment/helpers/db_schema'
import { DateTime } from 'luxon'

export default class EnrollmentChangeRequest extends BaseModel {
  static table = t('enrollment_change_requests')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare enrollmentId: string

  @column()
  declare changeType: string

  @column()
  declare enrollmentLineId: string | null

  @column()
  declare subjectId: string | null

  @column()
  declare subjectCode: string | null

  @column()
  declare subjectTitle: string | null

  @column()
  declare units: number | null

  @column()
  declare fromSectionId: string | null

  @column()
  declare toSectionId: string | null

  @column()
  declare status: string

  @column()
  declare requestedBy: string | null

  @column()
  declare decidedBy: string | null

  @column()
  declare decisionNotes: string | null

  @column.dateTime()
  declare decidedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
