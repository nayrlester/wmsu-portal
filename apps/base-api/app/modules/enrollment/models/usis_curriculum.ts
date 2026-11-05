import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import { t } from '#modules/enrollment/helpers/db_schema'
import Program from '#modules/enrollment/models/program'
import UsisCurriculumVersion from '#modules/enrollment/models/usis_curriculum_version'

export default class UsisCurriculum extends BaseModel {
  static table = t('usis_curricula')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare programId: string

  @column()
  declare code: string

  @column()
  declare name: string

  @column()
  declare isActive: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => Program)
  declare program: BelongsTo<typeof Program>

  @hasMany(() => UsisCurriculumVersion, { foreignKey: 'curriculumId' })
  declare versions: HasMany<typeof UsisCurriculumVersion>
}
