import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'
import { t } from '#modules/library/helpers/db_schema'

export type MemberType =
  | 'student'
  | 'faculty'
  | 'employee'
  | 'researcher'
  | 'guest'
  | 'alumni'

export type MembershipStatus = 'pending' | 'approved' | 'rejected' | 'suspended' | 'expired'

export default class Member extends BaseModel {
  static table = t('members')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare tenantId: string

  @column()
  declare fullName: string

  @column()
  declare email: string | null

  @column()
  declare contact: string | null

  @column()
  declare department: string | null

  @column()
  declare memberType: MemberType

  @column()
  declare membershipStatus: MembershipStatus

  @column()
  declare libraryCardNumber: string

  @column.dateTime()
  declare approvedAt: DateTime | null

  @column.dateTime()
  declare membershipExpiresAt: DateTime | null

  @column()
  declare approvedBy: string | null

  @column.dateTime()
  declare rejectedAt: DateTime | null

  @column()
  declare rejectedBy: string | null

  @column()
  declare rejectionReason: string | null

  @column()
  declare searchText: string | null

  @column()
  declare notes: string | null

  @column()
  declare isBlacklisted: boolean

  @column()
  declare isEnrolled: boolean

  @column()
  declare academicStatus: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @column.dateTime()
  declare deletedAt: DateTime | null
}
