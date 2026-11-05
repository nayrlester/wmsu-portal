import { t } from '#modules/documents/helpers/db_schema'
import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import { forTenant as tenantScope, notSoftDeleted } from '#modules/documents/domain/scopes/tenant_scopes'
import Tenant from '#modules/documents/models/tenant'
import User from '#modules/documents/models/user'
import DocumentType from '#modules/documents/models/document_type'
import Department from '#modules/documents/models/department'
import DocumentVersion from '#modules/documents/models/document_version'
import DocumentFile from '#modules/documents/models/document_file'
import Approval from '#modules/documents/models/approval'
import RoutingEntry from '#modules/documents/models/routing_entry'
import Comment from '#modules/documents/models/comment'
import RetentionSchedule from '#modules/documents/models/retention_schedule'

export default class Document extends BaseModel {
  static table = t('documents')

  static forTenant = tenantScope
  static notDeleted = notSoftDeleted

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare tenantId: string

  @column()
  declare trackingNumber: string

  @column()
  declare title: string

  @column()
  declare description: string | null

  @column()
  declare status: string

  @column()
  declare priority: string

  @column()
  declare documentTypeId: string | null

  @column()
  declare departmentId: string | null

  @column()
  declare createdById: string

  @column()
  declare assignedToId: string | null

  @column()
  declare updatedById: string | null

  @column()
  declare currentWorkflowId: string | null

  @column()
  declare qrCodeUrl: string | null

  @column()
  declare metadata: Record<string, unknown> | null

  @column()
  declare contentHtml: string | null

  @column()
  declare sourceType: string

  @column()
  declare visibility: string

  @column()
  declare originatingOfficeId: string | null

  @column()
  declare receivingOfficeId: string | null

  @column.date()
  declare documentDate: DateTime | null

  @column.dateTime()
  declare receivedAt: DateTime | null

  @column()
  declare subjectKeywords: string | null

  @column()
  declare confidentiality: string

  @column()
  declare napCategory: string | null

  @column()
  declare retentionScheduleId: string | null

  @column()
  declare lifecycleStatus: string

  @column.dateTime()
  declare retentionDueAt: DateTime | null

  @column()
  declare dispositionAction: string | null

  @column()
  declare physicalBoxId: string | null

  @column()
  declare physicalFolderId: string | null

  @column()
  declare receivingChannel: string | null

  @column()
  declare filePlanNodeId: string | null

  @column()
  declare receiptNumber: string | null

  @column()
  declare ocrQaStatus: string | null

  @column()
  declare legalHold: boolean

  @column()
  declare legalHoldReason: string | null

  @column.dateTime()
  declare legalHoldAt: DateTime | null

  @column()
  declare legalHoldById: string | null

  @column({
    prepare: (value: unknown) =>
      value === null || value === undefined ? null : JSON.stringify(value),
    consume: (
      value: string | Array<{ key: string; label: string; done: boolean }> | null
    ) => {
      if (value === null || value === undefined) return null
      if (typeof value === 'string') {
        try {
          return JSON.parse(value) as Array<{ key: string; label: string; done: boolean }>
        } catch {
          return null
        }
      }
      return value
    },
  })
  declare indexingChecklist: Array<{ key: string; label: string; done: boolean }> | null

  @column()
  declare aiClassification: Record<string, unknown> | null

  @column()
  declare aiSummary: string | null

  @column.dateTime()
  declare submittedAt: DateTime | null

  @column.dateTime()
  declare completedAt: DateTime | null

  @column.dateTime()
  declare archivedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @column.dateTime()
  declare deletedAt: DateTime | null

  @belongsTo(() => Tenant)
  declare tenant: BelongsTo<typeof Tenant>

  @belongsTo(() => DocumentType)
  declare documentType: BelongsTo<typeof DocumentType>

  @belongsTo(() => Department)
  declare department: BelongsTo<typeof Department>

  @belongsTo(() => Department, { foreignKey: 'originatingOfficeId' })
  declare originatingOffice: BelongsTo<typeof Department>

  @belongsTo(() => Department, { foreignKey: 'receivingOfficeId' })
  declare receivingOffice: BelongsTo<typeof Department>

  @belongsTo(() => RetentionSchedule, { foreignKey: 'retentionScheduleId' })
  declare retentionSchedule: BelongsTo<typeof RetentionSchedule>

  @belongsTo(() => User, { foreignKey: 'createdById' })
  declare createdBy: BelongsTo<typeof User>

  @belongsTo(() => User, { foreignKey: 'assignedToId' })
  declare assignedTo: BelongsTo<typeof User>

  @hasMany(() => DocumentVersion)
  declare versions: HasMany<typeof DocumentVersion>

  @hasMany(() => DocumentFile)
  declare files: HasMany<typeof DocumentFile>

  @hasMany(() => Approval)
  declare approvals: HasMany<typeof Approval>

  @hasMany(() => RoutingEntry)
  declare routingEntries: HasMany<typeof RoutingEntry>

  @hasMany(() => Comment)
  declare comments: HasMany<typeof Comment>
}
