import { BaseModel, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'
import { t } from '#modules/enrollment/helpers/db_schema'

export type GradeDisplayMode = 'immediate' | 'after_deadline' | 'manual_release'

export type GradeDocumentSignatory = { docType: string; role: string; name: string }

export default class UsisAcademicPolicy extends BaseModel {
  static table = t('usis_academic_policies')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column({
    prepare: (value: string[]) => JSON.stringify(value ?? []),
    consume: (value: string | string[]) =>
      typeof value === 'string' ? (JSON.parse(value) as string[]) : value,
  })
  declare enrollmentApprovalSteps: string[]

  @column()
  declare gradeDisplayMode: GradeDisplayMode

  @column()
  declare nextTermEnrollmentOpen: boolean

  @column({
    prepare: (value: GradeDocumentSignatory[]) => JSON.stringify(value ?? []),
    consume: (value: string | GradeDocumentSignatory[]) =>
      typeof value === 'string' ? (JSON.parse(value) as GradeDocumentSignatory[]) : value,
  })
  declare gradeDocumentSignatories: GradeDocumentSignatory[]

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null
}
