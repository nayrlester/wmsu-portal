import type { HttpContext } from '@adonisjs/core/http'
import { ok, fail } from '#modules/finance/helpers/api_envelope'
import { posService } from '#modules/finance/services/ufms/pos_service'
import {
  terminalValidator,
  catalogItemValidator,
  createSaleValidator,
  completeSaleValidator,
  voidSaleValidator,
  eodValidator,
  stockSnapshotValidator,
} from '#modules/finance/validators/pos'

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

export default class PosController {
  async listTerminals({ response, auth }: HttpContext) {
    const rows = await posService.listTerminals(auth.user!.organizationId)
    return response.ok(ok(rows, 'POS terminals'))
  }

  async storeTerminal({ request, response, auth }: HttpContext) {
    try {
      const payload = await request.validateUsing(terminalValidator)
      const row = await posService.upsertTerminal(actorOf(auth), payload)
      return response.created(ok(row, 'Terminal created'))
    } catch (error) {
      return handleError(response, error)
    }
  }

  async updateTerminal({ params, request, response, auth }: HttpContext) {
    try {
      const payload = await request.validateUsing(terminalValidator)
      const row = await posService.upsertTerminal(actorOf(auth), payload, params.id)
      return response.ok(ok(row, 'Terminal updated'))
    } catch (error) {
      return handleError(response, error)
    }
  }

  async listCatalog({ request, response, auth }: HttpContext) {
    const result = await posService.listCatalog(auth.user!.organizationId, {
      q: request.input('q'),
      category: request.input('category'),
      activeOnly: String(request.input('activeOnly', 'true')) !== 'false',
      page: Number(request.input('page', 1)) || 1,
      limit: Number(request.input('limit', 50)) || 50,
    })
    return response.ok(ok(result.all(), 'POS catalog', { ...result.getMeta() }))
  }

  async storeCatalogItem({ request, response, auth }: HttpContext) {
    try {
      const payload = await request.validateUsing(catalogItemValidator)
      const row = await posService.upsertCatalogItem(actorOf(auth), payload)
      return response.created(ok(row, 'Catalog item created'))
    } catch (error) {
      return handleError(response, error)
    }
  }

  async updateCatalogItem({ params, request, response, auth }: HttpContext) {
    try {
      const payload = await request.validateUsing(catalogItemValidator)
      const row = await posService.upsertCatalogItem(actorOf(auth), payload, params.id)
      return response.ok(ok(row, 'Catalog item updated'))
    } catch (error) {
      return handleError(response, error)
    }
  }

  async listSales({ request, response, auth }: HttpContext) {
    const result = await posService.listSales(auth.user!.organizationId, {
      status: request.input('status'),
      page: Number(request.input('page', 1)) || 1,
      limit: Number(request.input('limit', 50)) || 50,
    })
    return response.ok(ok(result.all(), 'POS sales', { ...result.getMeta() }))
  }

  async showSale({ params, response, auth }: HttpContext) {
    try {
      const row = await posService.getSale(auth.user!.organizationId, params.id)
      return response.ok(ok(row, 'POS sale'))
    } catch (error) {
      return handleError(response, error)
    }
  }

  async storeSale({ request, response, auth }: HttpContext) {
    try {
      const payload = await request.validateUsing(createSaleValidator)
      const row = await posService.createSale(actorOf(auth), payload)
      return response.created(ok(row, 'Sale draft created'))
    } catch (error) {
      return handleError(response, error)
    }
  }

  async completeSale({ params, request, response, auth }: HttpContext) {
    try {
      const payload = await request.validateUsing(completeSaleValidator)
      const row = await posService.completeSale(actorOf(auth), params.id, payload)
      return response.ok(ok(row, 'Sale completed'))
    } catch (error) {
      return handleError(response, error)
    }
  }

  async voidSale({ params, request, response, auth }: HttpContext) {
    try {
      const payload = await request.validateUsing(voidSaleValidator)
      const row = await posService.voidSale(actorOf(auth), params.id, payload.reason)
      return response.ok(ok(row, 'Sale voided'))
    } catch (error) {
      return handleError(response, error)
    }
  }

  async refundSale({ params, request, response, auth }: HttpContext) {
    try {
      const row = await posService.refundSale(actorOf(auth), params.id, request.body() as Record<string, unknown>)
      return response.ok(ok(row, 'Sale refunded'))
    } catch (error) {
      return handleError(response, error)
    }
  }

  async closeEod({ request, response, auth }: HttpContext) {
    try {
      const payload = await request.validateUsing(eodValidator)
      const row = await posService.closeEod(actorOf(auth), payload)
      return response.created(ok(row, 'EOD closed'))
    } catch (error) {
      return handleError(response, error)
    }
  }

  async cashierReport({ request, response, auth }: HttpContext) {
    const data = await posService.cashierReport(
      auth.user!.organizationId,
      request.input('businessDate')
    )
    return response.ok(ok(data, 'Cashier report'))
  }

  async listStockSnapshots({ response, auth }: HttpContext) {
    const rows = await posService.listStockSnapshots(auth.user!.organizationId)
    return response.ok(ok(rows, 'UIMS stock snapshots (cache)'))
  }

  async upsertStockSnapshot({ request, response, auth }: HttpContext) {
    try {
      const payload = await request.validateUsing(stockSnapshotValidator)
      const row = await posService.upsertStockSnapshot(actorOf(auth), payload)
      return response.ok(ok(row, 'Stock snapshot upserted'))
    } catch (error) {
      return handleError(response, error)
    }
  }

  async recordSale({ request, response, auth }: HttpContext) {
    try {
      const payload = request.only(['itemDescription', 'amount', 'reference'])
      const row = await posService.recordLegacySale(actorOf(auth), payload)
      return response.created(ok(row, 'POS sale recorded'))
    } catch (error) {
      return handleError(response, error)
    }
  }
}
