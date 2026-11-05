import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import { t } from '#modules/finance/helpers/db_schema'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import Organization from '#modules/finance/models/organization'
import Asset from '#modules/finance/models/asset'
import AssetAssignment from '#modules/finance/models/asset_assignment'
import Office from '#modules/finance/models/office'
import User from '#modules/finance/models/user'
import CoaDocumentLine from '#modules/finance/models/coa_document_line'

export default class CoaDocument extends BaseModel {
  static table = t('coa_documents')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare formType: string

  @column()
  declare documentNo: string

  @column()
  declare status: string

  @column()
  declare assetId: string | null

  @column()
  declare assignmentId: string | null

  @column()
  declare custodianUserId: string | null

  @column()
  declare custodianName: string | null

  @column()
  declare custodianExternalId: string | null

  @column()
  declare officeId: string | null

  @column.date()
  declare documentDate: DateTime

  @column({
    prepare: (v) => JSON.stringify(v ?? {}),
    consume: (v) => (typeof v === 'string' ? JSON.parse(v) : v ?? {}),
  })
  declare payload: Record<string, unknown>

  @column()
  declare preparedBy: string | null

  @column()
  declare approvedBy: string | null

  @column.dateTime()
  declare approvedAt: DateTime | null

  @column()
  declare signedCustodianAt: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  @belongsTo(() => Asset)
  declare asset: BelongsTo<typeof Asset>

  @belongsTo(() => AssetAssignment, { foreignKey: 'assignmentId' })
  declare assignment: BelongsTo<typeof AssetAssignment>

  @belongsTo(() => Office)
  declare office: BelongsTo<typeof Office>

  @belongsTo(() => User, { foreignKey: 'preparedBy' })
  declare preparer: BelongsTo<typeof User>

  @belongsTo(() => User, { foreignKey: 'approvedBy' })
  declare approver: BelongsTo<typeof User>

  @hasMany(() => CoaDocumentLine, { foreignKey: 'documentId' })
  declare lines: HasMany<typeof CoaDocumentLine>
}
