import { t } from '#modules/documents/helpers/db_schema'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import { forTenant as tenantScope } from '#modules/documents/domain/scopes/tenant_scopes'
import Tenant from '#modules/documents/models/tenant'
import User from '#modules/documents/models/user'
import Department from '#modules/documents/models/department'
import Document from '#modules/documents/models/document'

export default class ReceivingReceipt extends BaseModel {
  static table = t('receiving_receipts')
  static forTenant = tenantScope

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare tenantId: string

  @column()
  declare receiptNumber: string

  @column()
  declare channel: string

  @column()
  declare status: string

  @column.dateTime()
  declare receivedAt: DateTime

  @column()
  declare receivedById: string | null

  @column()
  declare originatingOfficeId: string | null

  @column()
  declare receivingOfficeId: string | null

  @column()
  declare senderName: string | null

  @column()
  declare title: string

  @column()
  declare description: string | null

  @column()
  declare physicalBoxId: string | null

  @column()
  declare physicalFolderId: string | null

  @column()
  declare documentId: string | null

  @column()
  declare acknowledgmentNotes: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => Tenant)
  declare tenant: BelongsTo<typeof Tenant>

  @belongsTo(() => User, { foreignKey: 'receivedById' })
  declare receivedBy: BelongsTo<typeof User>

  @belongsTo(() => Department, { foreignKey: 'originatingOfficeId' })
  declare originatingOffice: BelongsTo<typeof Department>

  @belongsTo(() => Department, { foreignKey: 'receivingOfficeId' })
  declare receivingOffice: BelongsTo<typeof Department>

  @belongsTo(() => Document)
  declare document: BelongsTo<typeof Document>
}
