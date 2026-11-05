import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { t } from '#modules/enrollment/helpers/db_schema'
import Subject from '#modules/enrollment/models/subject'
import UsisCurriculumVersion from '#modules/enrollment/models/usis_curriculum_version'

export default class UsisCurriculumVersionSubject extends BaseModel {
  static table = t('usis_curriculum_version_subjects')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare curriculumVersionId: string

  @column()
  declare subjectId: string

  @column()
  declare yearLevel: number

  @column()
  declare semester: number

  @column()
  declare isRequired: boolean

  @column()
  declare sortOrder: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => UsisCurriculumVersion, { foreignKey: 'curriculumVersionId' })
  declare version: BelongsTo<typeof UsisCurriculumVersion>

  @belongsTo(() => Subject)
  declare subject: BelongsTo<typeof Subject>
}
