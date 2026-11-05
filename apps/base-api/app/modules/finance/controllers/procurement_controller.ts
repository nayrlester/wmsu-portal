import type { HttpContext } from '@adonisjs/core/http'
import { ok, fail } from '#modules/finance/helpers/api_envelope'
import { procurementService } from '#modules/finance/services/ufms/procurement_service'
import {
  vendorValidator,
  createPrValidator,
  rejectPrValidator,
  createRfqValidator,
  createQuotationValidator,
  createAbstractValidator,
  createAwardValidator,
  createPoValidator,
  createDeliveryValidator,
  createIarValidator,
  documentRefValidator,
} from '#modules/finance/validators/procurement'

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

export default class ProcurementController {
  async listVendors({ request, response, auth }: HttpContext) {
    const result = await procurementService.listVendors(auth.user!.organizationId, {
      q: request.input('q'),
      active:
        request.input('active') === undefined
          ? undefined
          : String(request.input('active')) === 'true',
      page: Number(request.input('page', 1)) || 1,
      limit: Number(request.input('limit', 50)) || 50,
    })
    return response.ok(ok(result.all(), 'Vendors', { ...result.getMeta() }))
  }

  async storeVendor({ request, response, auth }: HttpContext) {
    try {
      const payload = await request.validateUsing(vendorValidator)
      const row = await procurementService.upsertVendor(actorOf(auth), payload)
      return response.created(ok(row, 'Vendor created'))
    } catch (error) {
      return handleError(response, error)
    }
  }

  async updateVendor({ params, request, response, auth }: HttpContext) {
    try {
      const payload = await request.validateUsing(vendorValidator)
      const row = await procurementService.upsertVendor(actorOf(auth), payload, params.id)
      return response.ok(ok(row, 'Vendor updated'))
    } catch (error) {
      return handleError(response, error)
    }
  }

  async listRequisitions({ request, response, auth }: HttpContext) {
    const result = await procurementService.listRequisitions(auth.user!.organizationId, {
      status: request.input('status'),
      fiscalYear: request.input('fiscalYear'),
      page: Number(request.input('page', 1)) || 1,
      limit: Number(request.input('limit', 50)) || 50,
    })
    return response.ok(ok(result.all(), 'Purchase requisitions', { ...result.getMeta() }))
  }

  async showRequisition({ params, response, auth }: HttpContext) {
    try {
      const row = await procurementService.getRequisition(auth.user!.organizationId, params.id)
      return response.ok(ok(row, 'Purchase requisition'))
    } catch (error) {
      return handleError(response, error)
    }
  }

  async storeRequisition({ request, response, auth }: HttpContext) {
    try {
      const payload = await request.validateUsing(createPrValidator)
      const row = await procurementService.createRequisition(actorOf(auth), payload)
      return response.created(ok(row, 'Purchase requisition created'))
    } catch (error) {
      return handleError(response, error)
    }
  }

  async submitRequisition({ params, response, auth }: HttpContext) {
    try {
      const result = await procurementService.submitRequisition(actorOf(auth), params.id)
      return response.ok(ok(result, 'Purchase requisition submitted'))
    } catch (error) {
      return handleError(response, error)
    }
  }

  async approveRequisition({ params, response, auth }: HttpContext) {
    try {
      const row = await procurementService.approveRequisition(actorOf(auth), params.id)
      return response.ok(ok(row, 'Purchase requisition approved'))
    } catch (error) {
      return handleError(response, error)
    }
  }

  async rejectRequisition({ params, request, response, auth }: HttpContext) {
    try {
      const payload = await request.validateUsing(rejectPrValidator)
      const row = await procurementService.rejectRequisition(actorOf(auth), params.id, payload.reason)
      return response.ok(ok(row, 'Purchase requisition rejected'))
    } catch (error) {
      return handleError(response, error)
    }
  }

  async listRfqs({ request, response, auth }: HttpContext) {
    const result = await procurementService.listRfqs(auth.user!.organizationId, {
      status: request.input('status'),
      page: Number(request.input('page', 1)) || 1,
      limit: Number(request.input('limit', 50)) || 50,
    })
    return response.ok(ok(result.all(), 'RFQs', { ...result.getMeta() }))
  }

  async storeRfq({ request, response, auth }: HttpContext) {
    try {
      const payload = await request.validateUsing(createRfqValidator)
      const row = await procurementService.createRfq(actorOf(auth), payload)
      return response.created(ok(row, 'RFQ created'))
    } catch (error) {
      return handleError(response, error)
    }
  }

  async issueRfq({ params, response, auth }: HttpContext) {
    try {
      const row = await procurementService.transitionRfq(actorOf(auth), params.id, 'issued')
      return response.ok(ok(row, 'RFQ issued'))
    } catch (error) {
      return handleError(response, error)
    }
  }

  async closeRfq({ params, response, auth }: HttpContext) {
    try {
      const row = await procurementService.transitionRfq(actorOf(auth), params.id, 'closed')
      return response.ok(ok(row, 'RFQ closed'))
    } catch (error) {
      return handleError(response, error)
    }
  }

  async storeQuotation({ request, response, auth }: HttpContext) {
    try {
      const payload = await request.validateUsing(createQuotationValidator)
      const row = await procurementService.addQuotation(actorOf(auth), payload)
      return response.created(ok(row, 'Quotation recorded'))
    } catch (error) {
      return handleError(response, error)
    }
  }

  async storeAbstract({ request, response, auth }: HttpContext) {
    try {
      const payload = await request.validateUsing(createAbstractValidator)
      const row = await procurementService.createAbstract(actorOf(auth), payload)
      return response.created(ok(row, 'Abstract of quotations created'))
    } catch (error) {
      return handleError(response, error)
    }
  }

  async storeAward({ request, response, auth }: HttpContext) {
    try {
      const payload = await request.validateUsing(createAwardValidator)
      const row = await procurementService.createAward(actorOf(auth), payload)
      return response.created(ok(row, 'Award recorded'))
    } catch (error) {
      return handleError(response, error)
    }
  }

  async listPurchaseOrders({ request, response, auth }: HttpContext) {
    const result = await procurementService.listPurchaseOrders(auth.user!.organizationId, {
      status: request.input('status'),
      page: Number(request.input('page', 1)) || 1,
      limit: Number(request.input('limit', 50)) || 50,
    })
    return response.ok(ok(result.all(), 'Purchase orders', { ...result.getMeta() }))
  }

  async showPurchaseOrder({ params, response, auth }: HttpContext) {
    try {
      const row = await procurementService.getPurchaseOrder(auth.user!.organizationId, params.id)
      return response.ok(ok(row, 'Purchase order'))
    } catch (error) {
      return handleError(response, error)
    }
  }

  async storePurchaseOrder({ request, response, auth }: HttpContext) {
    try {
      const payload = await request.validateUsing(createPoValidator)
      const row = await procurementService.createPurchaseOrder(actorOf(auth), payload)
      return response.created(ok(row, 'Purchase order created'))
    } catch (error) {
      return handleError(response, error)
    }
  }

  async createPurchaseOrder({ request, response, auth }: HttpContext) {
    return this.storePurchaseOrder({ request, response, auth } as HttpContext)
  }

  async approvePurchaseOrder({ params, response, auth }: HttpContext) {
    try {
      const row = await procurementService.transitionPurchaseOrder(actorOf(auth), params.id, 'approved')
      return response.ok(ok(row, 'Purchase order approved'))
    } catch (error) {
      return handleError(response, error)
    }
  }

  async issuePurchaseOrder({ params, response, auth }: HttpContext) {
    try {
      const row = await procurementService.transitionPurchaseOrder(actorOf(auth), params.id, 'issued')
      return response.ok(ok(row, 'Purchase order issued'))
    } catch (error) {
      return handleError(response, error)
    }
  }

  async storeDelivery({ request, response, auth }: HttpContext) {
    try {
      const payload = await request.validateUsing(createDeliveryValidator)
      const row = await procurementService.recordDelivery(actorOf(auth), payload)
      return response.created(ok(row, 'Delivery recorded'))
    } catch (error) {
      return handleError(response, error)
    }
  }

  async storeIar({ request, response, auth }: HttpContext) {
    try {
      const payload = await request.validateUsing(createIarValidator)
      const row = await procurementService.issueIar(actorOf(auth), payload)
      return response.created(ok(row, 'IAR issued'))
    } catch (error) {
      return handleError(response, error)
    }
  }

  async listIars({ request, response, auth }: HttpContext) {
    const result = await procurementService.listIars(auth.user!.organizationId, {
      page: Number(request.input('page', 1)) || 1,
      limit: Number(request.input('limit', 50)) || 50,
    })
    return response.ok(ok(result.all(), 'Inspection and acceptance reports', { ...result.getMeta() }))
  }

  async monitor({ response, auth }: HttpContext) {
    const data = await procurementService.monitor(auth.user!.organizationId)
    return response.ok(ok(data, 'Procurement monitor'))
  }

  async storeDocumentRef({ request, response, auth }: HttpContext) {
    try {
      const payload = await request.validateUsing(documentRefValidator)
      const row = await procurementService.addDocumentRef(actorOf(auth), payload)
      return response.created(ok(row, 'Document reference recorded'))
    } catch (error) {
      return handleError(response, error)
    }
  }

  async listDocumentRefs({ request, response, auth }: HttpContext) {
    const result = await procurementService.listDocumentRefs(auth.user!.organizationId, {
      entityType: request.input('entityType'),
      entityId: request.input('entityId'),
      page: Number(request.input('page', 1)) || 1,
      limit: Number(request.input('limit', 50)) || 50,
    })
    return response.ok(ok(result.all(), 'Document references', { ...result.getMeta() }))
  }
}
