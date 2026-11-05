import { DateTime } from 'luxon'
import User from '#modules/documents/models/user'
import Document from '#modules/documents/models/document'
import DocumentFile from '#modules/documents/models/document_file'
import { subscriptionService } from '#modules/documents/services/subscription_service'
import { PlanLimitExceededException } from '#modules/documents/domain/exceptions/tenant_exceptions'
import Workflow from '#modules/documents/models/workflow'

export interface TenantUsage {
  users: number
  documents: number
  storageBytes: number
}

export interface TenantLimits {
  maxUsers: number | null
  maxDocuments: number | null
  maxStorageBytes: number | null
  features: Record<string, unknown> | null
}

export class PlanLimitService {
  async getUsage(tenantId: string): Promise<TenantUsage> {
    const [userCount, documentCount, storageResult] = await Promise.all([
      User.query().where('tenant_id', tenantId).whereNull('deleted_at').count('* as total'),
      Document.query().where('tenant_id', tenantId).whereNull('deleted_at').count('* as total'),
      DocumentFile.query().where('tenant_id', tenantId).sum('file_size as total'),
    ])

    return {
      users: Number(userCount[0]?.$extras.total ?? 0),
      documents: Number(documentCount[0]?.$extras.total ?? 0),
      storageBytes: Number(storageResult[0]?.$extras.total ?? 0),
    }
  }

  async getLimits(tenantId: string): Promise<TenantLimits> {
    const plan = await subscriptionService.getActivePlan(tenantId)
    return {
      maxUsers: plan.maxUsers,
      maxDocuments: plan.maxDocuments,
      maxStorageBytes: plan.maxStorageBytes,
      features: plan.features,
    }
  }

  async getUsageWithLimits(tenantId: string) {
    const [usage, limits, plan] = await Promise.all([
      this.getUsage(tenantId),
      this.getLimits(tenantId),
      subscriptionService.getActivePlan(tenantId),
    ])

    return {
      usage,
      limits,
      plan: {
        name: plan.name,
        slug: plan.slug,
      },
    }
  }

  async assertCanAddUser(tenantId: string): Promise<void> {
    const limits = await this.getLimits(tenantId)
    if (limits.maxUsers === null) return

    const usage = await this.getUsage(tenantId)
    if (usage.users >= limits.maxUsers) {
      throw new PlanLimitExceededException('users', `User limit reached (${limits.maxUsers})`)
    }
  }

  async assertCanCreateDocument(tenantId: string): Promise<void> {
    const limits = await this.getLimits(tenantId)
    if (limits.maxDocuments === null) return

    const usage = await this.getUsage(tenantId)
    if (usage.documents >= limits.maxDocuments) {
      throw new PlanLimitExceededException(
        'documents',
        `Document limit reached (${limits.maxDocuments})`
      )
    }
  }

  async assertCanUploadBytes(tenantId: string, bytes: number): Promise<void> {
    const limits = await this.getLimits(tenantId)
    if (limits.maxStorageBytes === null) return

    const usage = await this.getUsage(tenantId)
    if (usage.storageBytes + bytes > limits.maxStorageBytes) {
      throw new PlanLimitExceededException('storage', 'Storage limit exceeded')
    }
  }

  async assertCanCreateWorkflow(tenantId: string): Promise<void> {
    const limits = await this.getLimits(tenantId)
    const maxWorkflows = limits.features?.workflows

    if (maxWorkflows === undefined || maxWorkflows === null) return
    if (typeof maxWorkflows === 'number' && maxWorkflows < 0) return

    const countRow = await Workflow.query().where('tenant_id', tenantId).whereNull('deleted_at').count('* as total')
    const count = Number(countRow[0]?.$extras.total ?? 0)
    if (typeof maxWorkflows === 'number' && count >= maxWorkflows) {
      throw new PlanLimitExceededException('workflows', `Workflow limit reached (${maxWorkflows})`)
    }
  }

  async assertFeatureEnabled(tenantId: string, feature: string): Promise<void> {
    const limits = await this.getLimits(tenantId)
    const value = limits.features?.[feature]

    if (value === false || value === 0) {
      throw new PlanLimitExceededException('feature', `Feature "${feature}" is not available on your plan`)
    }
  }

  hasFeature(limits: TenantLimits, feature: string): boolean {
    const value = limits.features?.[feature]
    if (value === undefined || value === null) return false
    if (typeof value === 'boolean') return value
    if (typeof value === 'number') return value !== 0
    return true
  }

  async getUsageTrend(tenantId: string, months = 6) {
    const limits = await this.getLimits(tenantId)
    const boundedMonths = Math.min(Math.max(months, 1), 12)
    const start = DateTime.now().minus({ months: boundedMonths - 1 }).startOf('month')

    const toPercent = (used: number, max: number | null) => {
      if (max === null) return null
      if (max === 0) return used > 0 ? 100 : 0
      return Math.min(100, Math.round((used / max) * 100))
    }

    const monthly = await Promise.all(
      Array.from({ length: boundedMonths }, async (_, index) => {
        const monthEnd = start.plus({ months: index }).endOf('month')

        const [userCount, documentCount, storageResult] = await Promise.all([
          User.query()
            .where('tenant_id', tenantId)
            .whereNull('deleted_at')
            .where('created_at', '<=', monthEnd.toSQL()!)
            .count('* as total'),
          Document.query()
            .where('tenant_id', tenantId)
            .whereNull('deleted_at')
            .where('created_at', '<=', monthEnd.toSQL()!)
            .count('* as total'),
          DocumentFile.query()
            .where('tenant_id', tenantId)
            .where('created_at', '<=', monthEnd.toSQL()!)
            .sum('file_size as total'),
        ])

        const users = Number(userCount[0]?.$extras.total ?? 0)
        const documents = Number(documentCount[0]?.$extras.total ?? 0)
        const storageBytes = Number(storageResult[0]?.$extras.total ?? 0)

        return {
          month: start.plus({ months: index }).toFormat('MMM'),
          users: toPercent(users, limits.maxUsers),
          documents: toPercent(documents, limits.maxDocuments),
          storage: toPercent(storageBytes, limits.maxStorageBytes),
        }
      })
    )

    return {
      limits: {
        maxUsers: limits.maxUsers,
        maxDocuments: limits.maxDocuments,
        maxStorageBytes: limits.maxStorageBytes,
      },
      monthly,
    }
  }
}

export const planLimitService = new PlanLimitService()
