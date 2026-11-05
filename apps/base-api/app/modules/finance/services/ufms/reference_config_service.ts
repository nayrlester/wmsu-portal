import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import ChartOfAccount from '#modules/finance/models/chart_of_account'
import Fund from '#modules/finance/models/fund'
import Bank from '#modules/finance/models/bank'
import BankAccount from '#modules/finance/models/bank_account'
import FiscalPeriod from '#modules/finance/models/fiscal_period'
import OrSeries from '#modules/finance/models/or_series'
import ApprovalWorkflowDefinition from '#modules/finance/models/approval_workflow_definition'
import ApprovalWorkflowStep from '#modules/finance/models/approval_workflow_step'
import { auditLogService } from '#modules/finance/services/audit_log_service'

type Actor = { id: string; organizationId: string }

function serialize(model: { serialize: () => Record<string, unknown> }) {
  return model.serialize()
}

function toDateTime(value: unknown): DateTime {
  if (DateTime.isDateTime(value)) return value
  if (value instanceof Date) return DateTime.fromJSDate(value)
  if (typeof value === 'string') {
    const parsed = DateTime.fromISO(value)
    if (parsed.isValid) return parsed
  }
  throw Object.assign(new Error('Invalid date value'), { status: 422 })
}

export class UfmsReferenceConfigService {
  async listChartAccounts(organizationId: string, page = 1, limit = 50, q?: string) {
    const query = ChartOfAccount.query()
      .where('organizationId', organizationId)
      .orderBy('sortOrder', 'asc')
      .orderBy('accountCode', 'asc')
    if (q) {
      query.where((builder) => {
        builder
          .whereILike('accountCode', `%${q}%`)
          .orWhereILike('accountTitle', `%${q}%`)
          .orWhereILike('uacsCode', `%${q}%`)
      })
    }
    return query.paginate(page, limit)
  }

  async updateChartAccount(actor: Actor, id: string, payload: Record<string, unknown>) {
    const account = await ChartOfAccount.query()
      .where('organizationId', actor.organizationId)
      .where('id', id)
      .first()
    if (!account) throw Object.assign(new Error('Chart account not found'), { status: 404 })
    const before = serialize(account)
    if (payload.accountTitle !== undefined) account.accountTitle = String(payload.accountTitle)
    if (payload.accountType !== undefined) account.accountType = String(payload.accountType)
    if (payload.parentId !== undefined) account.parentId = (payload.parentId as string | null) ?? null
    if (payload.uacsCode !== undefined) account.uacsCode = (payload.uacsCode as string | null) ?? null
    if (payload.description !== undefined) {
      account.description = (payload.description as string | null) ?? null
    }
    if (payload.contraAccountId !== undefined) {
      account.contraAccountId = (payload.contraAccountId as string | null) ?? null
    }
    if (payload.subsidiaryTag !== undefined) {
      account.subsidiaryTag = (payload.subsidiaryTag as string | null) ?? null
    }
    if (payload.sortOrder !== undefined) account.sortOrder = Number(payload.sortOrder)
    if (payload.isPostable !== undefined) account.isPostable = Boolean(payload.isPostable)
    if (payload.isActive !== undefined) account.isActive = Boolean(payload.isActive)
    account.updatedBy = actor.id
    await account.save()
    await auditLogService.log({
      organizationId: actor.organizationId,
      actorUserId: actor.id,
      action: 'update',
      entityType: 'chart_of_accounts',
      entityId: account.id,
      metadata: { before, after: serialize(account), tor: 'FIN-022' },
    })
    return account
  }

  async createChartAccount(actor: Actor, payload: Record<string, unknown>) {
    const account = await ChartOfAccount.create({
      organizationId: actor.organizationId,
      accountCode: String(payload.accountCode),
      accountTitle: String(payload.accountTitle),
      accountType: String(payload.accountType),
      parentId: (payload.parentId as string | null | undefined) ?? null,
      uacsCode: (payload.uacsCode as string | null | undefined) ?? null,
      description: (payload.description as string | null | undefined) ?? null,
      contraAccountId: (payload.contraAccountId as string | null | undefined) ?? null,
      subsidiaryTag: (payload.subsidiaryTag as string | null | undefined) ?? null,
      sortOrder: Number(payload.sortOrder ?? 0),
      isPostable: payload.isPostable !== false,
      isActive: payload.isActive !== false,
      createdBy: actor.id,
      updatedBy: actor.id,
    })

    await auditLogService.log({
      organizationId: actor.organizationId,
      actorUserId: actor.id,
      action: 'create',
      entityType: 'chart_of_accounts',
      entityId: account.id,
      metadata: { after: serialize(account) },
    })

    return account
  }

  async listFunds(organizationId: string, page = 1, limit = 50) {
    return Fund.query()
      .where('organizationId', organizationId)
      .orderBy('fundCode', 'asc')
      .paginate(page, limit)
  }

  async createFund(actor: Actor, payload: Record<string, unknown>) {
    const fund = await Fund.create({
      organizationId: actor.organizationId,
      fundCode: String(payload.fundCode),
      fundName: String(payload.fundName),
      fundType: (payload.fundType as string | null | undefined) ?? null,
      openingBalance: String(payload.openingBalance ?? 0),
      description: (payload.description as string | null | undefined) ?? null,
      isActive: payload.isActive !== false,
      createdBy: actor.id,
      updatedBy: actor.id,
    })

    await auditLogService.log({
      organizationId: actor.organizationId,
      actorUserId: actor.id,
      action: 'create',
      entityType: 'funds',
      entityId: fund.id,
      metadata: { after: serialize(fund) },
    })

    return fund
  }

  async listBanks(organizationId: string, page = 1, limit = 50) {
    return Bank.query()
      .where('organizationId', organizationId)
      .orderBy('bankCode', 'asc')
      .paginate(page, limit)
  }

  async createBank(actor: Actor, payload: Record<string, unknown>) {
    const bank = await Bank.create({
      organizationId: actor.organizationId,
      bankCode: String(payload.bankCode),
      bankName: String(payload.bankName),
      isActive: payload.isActive !== false,
      createdBy: actor.id,
      updatedBy: actor.id,
    })

    await auditLogService.log({
      organizationId: actor.organizationId,
      actorUserId: actor.id,
      action: 'create',
      entityType: 'banks',
      entityId: bank.id,
      metadata: { after: serialize(bank) },
    })

    return bank
  }

  async listBankAccounts(organizationId: string, page = 1, limit = 50, bankId?: string) {
    const query = BankAccount.query()
      .where('organizationId', organizationId)
      .orderBy('accountNumber', 'asc')
    if (bankId) query.where('bankId', bankId)
    return query.paginate(page, limit)
  }

  async createBankAccount(actor: Actor, payload: Record<string, unknown>) {
    const bank = await Bank.query()
      .where('id', String(payload.bankId))
      .where('organizationId', actor.organizationId)
      .first()
    if (!bank) {
      throw Object.assign(new Error('Bank not found in organization'), { status: 404 })
    }

    if (payload.fundId) {
      const fund = await Fund.query()
        .where('id', String(payload.fundId))
        .where('organizationId', actor.organizationId)
        .first()
      if (!fund) {
        throw Object.assign(new Error('Fund not found in organization'), { status: 404 })
      }
    }

    const account = await BankAccount.create({
      organizationId: actor.organizationId,
      bankId: bank.id,
      fundId: (payload.fundId as string | null | undefined) ?? null,
      accountNumber: String(payload.accountNumber),
      accountName: String(payload.accountName),
      currencyCode: String(payload.currencyCode ?? 'PHP'),
      isActive: payload.isActive !== false,
      createdBy: actor.id,
      updatedBy: actor.id,
    })

    await auditLogService.log({
      organizationId: actor.organizationId,
      actorUserId: actor.id,
      action: 'create',
      entityType: 'bank_accounts',
      entityId: account.id,
      metadata: { after: serialize(account) },
    })

    return account
  }

  async listFiscalPeriods(organizationId: string, page = 1, limit = 50) {
    return FiscalPeriod.query()
      .where('organizationId', organizationId)
      .orderBy('startsOn', 'desc')
      .paginate(page, limit)
  }

  async createFiscalPeriod(actor: Actor, payload: Record<string, unknown>) {
    const startsOn = toDateTime(payload.startsOn)
    const endsOn = toDateTime(payload.endsOn)
    if (endsOn < startsOn) {
      throw Object.assign(new Error('endsOn must be on or after startsOn'), { status: 422 })
    }

    const period = await FiscalPeriod.create({
      organizationId: actor.organizationId,
      code: String(payload.code),
      name: String(payload.name),
      startsOn,
      endsOn,
      status: String(payload.status ?? 'open'),
      createdBy: actor.id,
      updatedBy: actor.id,
    })

    await auditLogService.log({
      organizationId: actor.organizationId,
      actorUserId: actor.id,
      action: 'create',
      entityType: 'fiscal_periods',
      entityId: period.id,
      metadata: { after: serialize(period) },
    })

    return period
  }

  async listOrSeries(organizationId: string, page = 1, limit = 50) {
    return OrSeries.query()
      .where('organizationId', organizationId)
      .orderBy('seriesCode', 'asc')
      .paginate(page, limit)
  }

  async createOrSeries(actor: Actor, payload: Record<string, unknown>) {
    const series = await OrSeries.create({
      organizationId: actor.organizationId,
      seriesCode: String(payload.seriesCode),
      prefix: String(payload.prefix),
      nextNumber: Number(payload.nextNumber ?? 1),
      padding: Number(payload.padding ?? 6),
      isActive: payload.isActive !== false,
      createdBy: actor.id,
      updatedBy: actor.id,
    })

    await auditLogService.log({
      organizationId: actor.organizationId,
      actorUserId: actor.id,
      action: 'create',
      entityType: 'or_series',
      entityId: series.id,
      metadata: { after: serialize(series) },
    })

    return series
  }

  async listApprovalWorkflows(organizationId: string, page = 1, limit = 50) {
    return ApprovalWorkflowDefinition.query()
      .where('organizationId', organizationId)
      .preload('steps', (q) => q.orderBy('stepOrder', 'asc'))
      .orderBy('code', 'asc')
      .paginate(page, limit)
  }

  async createApprovalWorkflow(actor: Actor, payload: Record<string, unknown>) {
    const workflow = await db.transaction(async (trx) => {
      const created = await ApprovalWorkflowDefinition.create(
        {
          organizationId: actor.organizationId,
          code: String(payload.code),
          name: String(payload.name),
          entityType: String(payload.entityType),
          isActive: payload.isActive !== false,
          createdBy: actor.id,
          updatedBy: actor.id,
        },
        { client: trx }
      )

      const stepsInput = (payload.steps as Array<Record<string, unknown>> | undefined) ?? []
      for (const step of stepsInput) {
        await ApprovalWorkflowStep.create(
          {
            organizationId: actor.organizationId,
            workflowId: created.id,
            stepOrder: Number(step.stepOrder),
            name: String(step.name),
            requiredPermission: (step.requiredPermission as string | null | undefined) ?? null,
          },
          { client: trx }
        )
      }

      await created.useTransaction(trx).load('steps')
      return created
    })

    await auditLogService.log({
      organizationId: actor.organizationId,
      actorUserId: actor.id,
      action: 'create',
      entityType: 'approval_workflow_definitions',
      entityId: workflow.id,
      metadata: { after: serialize(workflow) },
    })

    return workflow
  }
}

export const ufmsReferenceConfigService = new UfmsReferenceConfigService()
