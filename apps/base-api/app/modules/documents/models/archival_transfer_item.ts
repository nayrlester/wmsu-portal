import { t } from '#modules/documents/helpers/db_schema'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import { forTenant as tenantScope } from '#modules/documents/domain/scopes/tenant_scopes'
import Tenant from '#modules/documents/models/tenant'
import Document from '#modules/documents/models/document'
import ArchivalTransfer from '#modules/documents/models/archival_transfer'

export default class ArchivalTransferItem extends BaseModel {
  static table = t('archival_transfer_items')
  static forTenant = tenantScope

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare tenantId: string

  @column()
  declare transferId: string

  @column()
  declare documentId: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @belongsTo(() => Tenant)
  declare tenant: BelongsTo<typeof Tenant>

  @belongsTo(() => ArchivalTransfer, { foreignKey: 'transferId' })
  declare transfer: BelongsTo<typeof ArchivalTransfer>

  @belongsTo(() => Document)
  declare document: BelongsTo<typeof Document>
}
