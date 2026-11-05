import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import { t } from '#modules/enrollment/helpers/db_schema'
import UsisCurriculum from '#modules/enrollment/models/usis_curriculum'
import UsisCurriculumVersionSubject from '#modules/enrollment/models/usis_curriculum_version_subject'

export type CurriculumVersionStatus = 'draft' | 'active' | 'archived'

export default class UsisCurriculumVersion extends BaseModel {
  static table = t('usis_curriculum_versions')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare curriculumId: string

  @column()
  declare versionLabel: string

  @column()
  declare status: CurriculumVersionStatus

  @column.date()
  declare effectiveFrom: DateTime | null

  @column()
  declare notes: string | null

  @column()
  declare duplicatedFromVersionId: string | null

  @column()
  declare createdBy: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => UsisCurriculum, { foreignKey: 'curriculumId' })
  declare curriculum: BelongsTo<typeof UsisCurriculum>

  @hasMany(() => UsisCurriculumVersionSubject, { foreignKey: 'curriculumVersionId' })
  declare subjects: HasMany<typeof UsisCurriculumVersionSubject>
}
