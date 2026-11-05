import type { HttpContext } from '@adonisjs/core/http'
import { ok, fail } from '#modules/finance/helpers/api_envelope'
import { accountingService } from '#modules/finance/services/ufms/accounting_service'
import {
  createJournalValidator,
  createTaxRateValidator,
  createTaxEntryValidator,
  remitTaxValidator,
  createBankReconValidator,
} from '#modules/finance/validators/accounting'

function actorOf(auth: HttpContext['auth']) {
  const user = auth.user!
  return { id: user.id, organizationId: user.organizationId }
}

function handleError(response: HttpContext['response'], error: unknown) {
  const err = error as { status?: number; message?: string; messages?: unknown; code?: string }
  if (err.status === 404) return response.notFound(fail(err.message ?? 'Not found'))
  if (err.status === 422) return response.unprocessableEntity(fail(err.message ?? 'Validation failed'))
  if (err.messages) {
    return response.unprocessableEntity(fail('Validation failed', { errors: err.messages }))
  }
  if (err.code === '23505') return response.conflict(fail(err.message ?? 'Duplicate record'))
  throw error
}

export default class AccountingController {
  async listJournals({ request, response, auth }: HttpContext) {
    const result = await accountingService.listJournals(auth.user!.organizationId, {
      status: request.input('status'),
      fiscalYear: request.input('fiscalYear'),
      entryType: request.input('entryType'),
      page: Number(request.input('page', 1)) || 1,
      limit: Number(request.input('limit', 50)) || 50,
    })
    return response.ok(ok(result.all(), 'Journal entries', { ...result.getMeta() }))
  }

  async showJournal({ params, response, auth }: HttpContext) {
    try {
      const entry = await accountingService.getJournal(auth.user!.organizationId, params.id)
      return response.ok(ok(entry, 'Journal entry'))
    } catch (error) {
      return handleError(response, error)
    }
  }

  async storeJournal({ request, response, auth }: HttpContext) {
    try {
      const payload = await request.validateUsing(createJournalValidator)
      const entry = await accountingService.createJournal(actorOf(auth), payload)
      return response.created(ok(entry, 'Journal entry created'))
    } catch (error) {
      return handleError(response, error)
    }
  }

  async submitJournal({ params, response, auth }: HttpContext) {
    try {
      const entry = await accountingService.transitionJournal(actorOf(auth), params.id, 'submitted')
      return response.ok(ok(entry, 'Journal submitted'))
    } catch (error) {
      return handleError(response, error)
    }
  }

  async postJournal({ params, response, auth }: HttpContext) {
    try {
      const entry = await accountingService.transitionJournal(actorOf(auth), params.id, 'posted')
      return response.ok(ok(entry, 'Journal posted'))
    } catch (error) {
      return handleError(response, error)
    }
  }

  async reviseJournal({ params, response, auth }: HttpContext) {
    try {
      const entry = await accountingService.transitionJournal(actorOf(auth), params.id, 'draft')
      return response.ok(ok(entry, 'Journal returned to draft'))
    } catch (error) {
      return handleError(response, error)
    }
  }

  async listLedger({ request, response, auth }: HttpContext) {
    const result = await accountingService.listLedger(auth.user!.organizationId, {
      accountId: request.input('accountId'),
      fundId: request.input('fundId'),
      fiscalYear: request.input('fiscalYear'),
      subsidiaryEntityType: request.input('subsidiaryEntityType'),
      subsidiaryEntityRef: request.input('subsidiaryEntityRef'),
      page: Number(request.input('page', 1)) || 1,
      limit: Number(request.input('limit', 50)) || 50,
    })
    return response.ok(ok(result.all(), 'General ledger', { ...result.getMeta() }))
  }

  async trialBalance({ request, response, auth }: HttpContext) {
    const fiscalYear = String(request.input('fiscalYear') || new Date().getFullYear())
    const data = await accountingService.trialBalance(
      auth.user!.organizationId,
      fiscalYear,
      request.input('fundId')
    )
    return response.ok(ok(data, 'Trial balance'))
  }

  async cashFlow({ request, response, auth }: HttpContext) {
    const fiscalYear = String(request.input('fiscalYear') || new Date().getFullYear())
    const data = await accountingService.cashFlowMonitor(auth.user!.organizationId, fiscalYear)
    return response.ok(ok(data, 'Cash flow monitor'))
  }

  async closePeriod({ params, response, auth }: HttpContext) {
    try {
      const period = await accountingService.closeFiscalPeriod(actorOf(auth), params.id)
      return response.ok(ok(period, 'Fiscal period closed'))
    } catch (error) {
      return handleError(response, error)
    }
  }

  async reopenPeriod({ params, response, auth }: HttpContext) {
    try {
      const period = await accountingService.reopenFiscalPeriod(actorOf(auth), params.id)
      return response.ok(ok(period, 'Fiscal period reopened'))
    } catch (error) {
      return handleError(response, error)
    }
  }

  async listTaxRates({ response, auth }: HttpContext) {
    const rows = await accountingService.listTaxRates(auth.user!.organizationId)
    return response.ok(ok(rows, 'Tax withholding rates'))
  }

  async storeTaxRate({ request, response, auth }: HttpContext) {
    try {
      const payload = await request.validateUsing(createTaxRateValidator)
      const row = await accountingService.createTaxRate(actorOf(auth), payload)
      return response.created(ok(row, 'Tax rate created'))
    } catch (error) {
      return handleError(response, error)
    }
  }

  async storeTaxEntry({ request, response, auth }: HttpContext) {
    try {
      const payload = await request.validateUsing(createTaxEntryValidator)
      const row = await accountingService.createTaxEntry(actorOf(auth), payload)
      return response.created(ok(row, 'Withholding entry created'))
    } catch (error) {
      return handleError(response, error)
    }
  }

  async remittanceReport({ request, response, auth }: HttpContext) {
    const data = await accountingService.remittanceReport(auth.user!.organizationId, {
      from: request.input('from'),
      to: request.input('to'),
      status: request.input('status'),
    })
    return response.ok(ok(data, 'Remittance report'))
  }

  async markRemitted({ request, response, auth }: HttpContext) {
    try {
      const payload = await request.validateUsing(remitTaxValidator)
      const rows = await accountingService.markRemitted(
        actorOf(auth),
        payload.ids,
        payload.remittanceBatch
      )
      return response.ok(ok(rows, 'Marked remitted'))
    } catch (error) {
      return handleError(response, error)
    }
  }

  async listReconciliations({ request, response, auth }: HttpContext) {
    const result = await accountingService.listReconciliations(
      auth.user!.organizationId,
      Number(request.input('page', 1)) || 1,
      Number(request.input('limit', 50)) || 50
    )
    return response.ok(ok(result.all(), 'Bank reconciliations', { ...result.getMeta() }))
  }

  async storeReconciliation({ request, response, auth }: HttpContext) {
    try {
      const payload = await request.validateUsing(createBankReconValidator)
      const row = await accountingService.createReconciliation(actorOf(auth), payload)
      return response.created(ok(row, 'Bank reconciliation created'))
    } catch (error) {
      return handleError(response, error)
    }
  }

  async completeReconciliation({ params, response, auth }: HttpContext) {
    try {
      const row = await accountingService.completeReconciliation(actorOf(auth), params.id)
      return response.ok(ok(row, 'Bank reconciliation completed'))
    } catch (error) {
      return handleError(response, error)
    }
  }
}
