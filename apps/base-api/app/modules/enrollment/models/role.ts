import { BaseModel, column, belongsTo, manyToMany } from '@adonisjs/lucid/orm'
import { t } from '#modules/enrollment/helpers/db_schema'
import type { BelongsTo, ManyToMany } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import Organization from '#modules/enrollment/models/organization'
import Permission from '#modules/enrollment/models/permission'

export default class Role extends BaseModel {
  static table = t('roles')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare slug: string

  @column()
  declare name: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  @manyToMany(() => Permission, {
    pivotTable: t('role_permissions'),
    pivotForeignKey: 'role_id',
    pivotRelatedForeignKey: 'permission_id',
  })
  declare permissions: ManyToMany<typeof Permission>
}
