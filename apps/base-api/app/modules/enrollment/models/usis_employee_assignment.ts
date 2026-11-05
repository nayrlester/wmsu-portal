import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { t } from '#modules/enrollment/helpers/db_schema'
import Organization from '#modules/enrollment/models/organization'
import UsisCollege from '#modules/enrollment/models/usis_college'
import UsisAcademicDepartment from '#modules/enrollment/models/usis_academic_department'
import UsisPosition from '#modules/enrollment/models/usis_position'

export default class UsisEmployeeAssignment extends BaseModel {
  static table = t('usis_employee_assignments')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare platformUserId: string

  @column()
  declare displayName: string | null

  @column()
  declare collegeId: string | null

  @column()
  declare academicDepartmentId: string | null

  @column()
  declare positionId: string | null

  @column()
  declare isDepartmentHead: boolean

  @column()
  declare isActive: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  @belongsTo(() => UsisCollege, { foreignKey: 'collegeId' })
  declare college: BelongsTo<typeof UsisCollege>

  @belongsTo(() => UsisAcademicDepartment, { foreignKey: 'academicDepartmentId' })
  declare academicDepartment: BelongsTo<typeof UsisAcademicDepartment>

  @belongsTo(() => UsisPosition, { foreignKey: 'positionId' })
  declare position: BelongsTo<typeof UsisPosition>
}
