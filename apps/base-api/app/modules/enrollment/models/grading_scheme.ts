import { BaseModel, column } from '@adonisjs/lucid/orm'
import { t } from '#modules/enrollment/helpers/db_schema'
import { DateTime } from 'luxon'
import type { GradeMarkDefinition } from '#modules/enrollment/domain/grades'

export default class GradingScheme extends BaseModel {
  static table = t('grading_schemes')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare code: string

  @column()
  declare name: string

  @column({
    prepare: (value: { marks?: GradeMarkDefinition[] }) => JSON.stringify(value ?? {}),
    consume: (value: string | { marks?: GradeMarkDefinition[] }) =>
      typeof value === 'string' ? JSON.parse(value) : value,
  })
  declare definitionJson: { marks: GradeMarkDefinition[] }

  @column()
  declare failingMark: number

  @column()
  declare incConversionDays: number

  @column()
  declare isActive: boolean

  @column()
  declare isDefault: boolean

  @column.dateTime()
  declare deletedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
