import type { HttpContext } from '@adonisjs/core/http'
import { ok, fail } from '#modules/finance/helpers/api_envelope'
import { ufmsReferenceConfigService } from '#modules/finance/services/ufms/reference_config_service'
import {
  createChartAccountValidator,
  createFundValidator,
  createBankValidator,
  createBankAccountValidator,
  createFiscalPeriodValidator,
  createOrSeriesValidator,
  createApprovalWorkflowValidator,
} from '#modules/finance/validators/ufms'
import { updateCoaValidator } from '#modules/finance/validators/accounting'

function actorOf(auth: HttpContext['auth']) {
  const user = auth.user!
  return { id: user.id, organizationId: user.organizationId }
}

function pageOf(request: HttpContext['request']) {
  return {
    page: Number(request.input('page', 1)) || 1,
    limit: Math.min(Number(request.input('limit', 50)) || 50, 100),
  }
}

function handleError(response: HttpContext['response'], error: unknown) {
  const err = error as {
    status?: number
    message?: string
    messages?: unknown
    code?: string
  }
  if (err.status === 404) {
    return response.notFound(fail(err.message ?? 'Not found'))
  }
  if (err.status === 422) {
    return response.unprocessableEntity(fail(err.message ?? 'Validation failed'))
  }
  if (err.messages) {
    return response.unprocessableEntity(fail('Validation failed', { errors: err.messages }))
  }
  if (err.code === '23505') {
    return response.conflict(fail(err.message ?? 'Unique constraint violation'))
  }
  throw error
}

export default class UfmsReferenceController {
  async listCoa({ request, response, auth }: HttpContext) {
    const { page, limit } = pageOf(request)
    const result = await ufmsReferenceConfigService.listChartAccounts(
      auth.user!.organizationId,
      page,
      limit,
      request.input('q')
    )
    return response.ok(ok(result.all(), 'Chart of accounts', { ...result.getMeta() }))
  }

  async storeCoa({ request, response, auth }: HttpContext) {
    try {
      const payload = await request.validateUsing(createChartAccountValidator)
      const account = await ufmsReferenceConfigService.createChartAccount(actorOf(auth), payload)
      return response.created(ok(account, 'Chart account created'))
    } catch (error) {
      return handleError(response, error)
    }
  }

  async updateCoa({ params, request, response, auth }: HttpContext) {
    try {
      const payload = await request.validateUsing(updateCoaValidator)
      const account = await ufmsReferenceConfigService.updateChartAccount(
        actorOf(auth),
        params.id,
        payload
      )
      return response.ok(ok(account, 'Chart account updated'))
    } catch (error) {
      return handleError(response, error)
    }
  }

  async listFunds({ request, response, auth }: HttpContext) {
    const { page, limit } = pageOf(request)
    const result = await ufmsReferenceConfigService.listFunds(auth.user!.organizationId, page, limit)
    return response.ok(ok(result.all(), 'Funds', { ...result.getMeta() }))
  }

  async storeFund({ request, response, auth }: HttpContext) {
    try {
      const payload = await request.validateUsing(createFundValidator)
      const fund = await ufmsReferenceConfigService.createFund(actorOf(auth), payload)
      return response.created(ok(fund, 'Fund created'))
    } catch (error) {
      return handleError(response, error)
    }
  }

  async listBanks({ request, response, auth }: HttpContext) {
    const { page, limit } = pageOf(request)
    const result = await ufmsReferenceConfigService.listBanks(auth.user!.organizationId, page, limit)
    return response.ok(ok(result.all(), 'Banks', { ...result.getMeta() }))
  }

  async storeBank({ request, response, auth }: HttpContext) {
    try {
      const payload = await request.validateUsing(createBankValidator)
      const bank = await ufmsReferenceConfigService.createBank(actorOf(auth), payload)
      return response.created(ok(bank, 'Bank created'))
    } catch (error) {
      return handleError(response, error)
    }
  }

  async listBankAccounts({ request, response, auth }: HttpContext) {
    const { page, limit } = pageOf(request)
    const result = await ufmsReferenceConfigService.listBankAccounts(
      auth.user!.organizationId,
      page,
      limit,
      request.input('bankId')
    )
    return response.ok(ok(result.all(), 'Bank accounts', { ...result.getMeta() }))
  }

  async storeBankAccount({ request, response, auth }: HttpContext) {
    try {
      const payload = await request.validateUsing(createBankAccountValidator)
      const account = await ufmsReferenceConfigService.createBankAccount(actorOf(auth), payload)
      return response.created(ok(account, 'Bank account created'))
    } catch (error) {
      return handleError(response, error)
    }
  }

  async listFiscalPeriods({ request, response, auth }: HttpContext) {
    const { page, limit } = pageOf(request)
    const result = await ufmsReferenceConfigService.listFiscalPeriods(
      auth.user!.organizationId,
      page,
      limit
    )
    return response.ok(ok(result.all(), 'Fiscal periods', { ...result.getMeta() }))
  }

  async storeFiscalPeriod({ request, response, auth }: HttpContext) {
    try {
      const payload = await request.validateUsing(createFiscalPeriodValidator)
      const period = await ufmsReferenceConfigService.createFiscalPeriod(actorOf(auth), payload)
      return response.created(ok(period, 'Fiscal period created'))
    } catch (error) {
      return handleError(response, error)
    }
  }

  async listOrSeries({ request, response, auth }: HttpContext) {
    const { page, limit } = pageOf(request)
    const result = await ufmsReferenceConfigService.listOrSeries(
      auth.user!.organizationId,
      page,
      limit
    )
    return response.ok(ok(result.all(), 'OR series', { ...result.getMeta() }))
  }

  async storeOrSeries({ request, response, auth }: HttpContext) {
    try {
      const payload = await request.validateUsing(createOrSeriesValidator)
      const series = await ufmsReferenceConfigService.createOrSeries(actorOf(auth), payload)
      return response.created(ok(series, 'OR series created'))
    } catch (error) {
      return handleError(response, error)
    }
  }

  async listApprovalWorkflows({ request, response, auth }: HttpContext) {
    const { page, limit } = pageOf(request)
    const result = await ufmsReferenceConfigService.listApprovalWorkflows(
      auth.user!.organizationId,
      page,
      limit
    )
    return response.ok(ok(result.all(), 'Approval workflows', { ...result.getMeta() }))
  }

  async storeApprovalWorkflow({ request, response, auth }: HttpContext) {
    try {
      const payload = await request.validateUsing(createApprovalWorkflowValidator)
      const workflow = await ufmsReferenceConfigService.createApprovalWorkflow(actorOf(auth), payload)
      return response.created(ok(workflow, 'Approval workflow created'))
    } catch (error) {
      return handleError(response, error)
    }
  }
}
