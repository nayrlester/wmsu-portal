import type { HttpContext } from '@adonisjs/core/http'
import { ok, fail } from '#modules/finance/helpers/api_envelope'
import { apDisbursementService } from '#modules/finance/services/ufms/ap_disbursement_service'

function actorOf(auth: HttpContext['auth']) {
  const user = auth.user!
  return { id: user.id, organizationId: user.organizationId }
}

export default class DisbursementController {
  async listInvoices({ request, response, auth }: HttpContext) {
    const page = Number(request.input('page', 1)) || 1
    const limit = Math.min(Number(request.input('limit', 50)) || 50, 100)
    const result = await apDisbursementService.listVendorInvoices(auth.user!.organizationId, page, limit)
    return response.ok(ok(result.all(), 'Vendor invoices', { ...result.getMeta() }))
  }

  async storeInvoice({ request, response, auth }: HttpContext) {
    try {
      const invoice = await apDisbursementService.createVendorInvoice(
        actorOf(auth),
        request.body() as Record<string, unknown>
      )
      return response.created(ok(invoice, 'Vendor invoice created'))
    } catch (error) {
      const err = error as { status?: number; message?: string }
      if (err.status === 404) return response.notFound(fail(err.message ?? 'Not found'))
      if (err.status === 422) return response.unprocessableEntity(fail(err.message ?? 'Invalid invoice'))
      throw error
    }
  }

  async matchInvoice({ params, response, auth }: HttpContext) {
    const result = await apDisbursementService.threeWayMatch(actorOf(auth), params.id)
    return response.ok(ok(result, 'Three-way match result'))
  }

  async storeDv({ request, response, auth }: HttpContext) {
    try {
      const dv = await apDisbursementService.createDisbursementVoucher(
        actorOf(auth),
        request.body() as Record<string, unknown>
      )
      return response.created(ok(dv, 'Disbursement voucher created'))
    } catch (error) {
      const err = error as { status?: number; message?: string }
      if (err.status === 404) return response.notFound(fail(err.message ?? 'Not found'))
      if (err.status === 422) return response.unprocessableEntity(fail(err.message ?? 'Invalid DV'))
      throw error
    }
  }

  async listDv({ request, response, auth }: HttpContext) {
    const page = Number(request.input('page', 1)) || 1
    const limit = Math.min(Number(request.input('limit', 50)) || 50, 100)
    const result = await apDisbursementService.listDisbursementVouchers(auth.user!.organizationId, page, limit)
    return response.ok(ok(result.all(), 'Disbursement vouchers', { ...result.getMeta() }))
  }

  async approveDv({ params, response, auth }: HttpContext) {
    try {
      const dv = await apDisbursementService.approveDisbursementVoucher(actorOf(auth), params.id)
      return response.ok(ok(dv, 'Disbursement voucher approved'))
    } catch (error) {
      const err = error as { status?: number; message?: string }
      if (err.status === 404) return response.notFound(fail(err.message ?? 'Not found'))
      if (err.status === 422) return response.unprocessableEntity(fail(err.message ?? 'Invalid DV'))
      throw error
    }
  }

  async issueCheque({ params, request, response, auth }: HttpContext) {
    try {
      const cheque = await apDisbursementService.issueCheque(
        actorOf(auth),
        params.id,
        request.body() as Record<string, unknown>
      )
      return response.created(ok(cheque, 'Cheque issued'))
    } catch (error) {
      const err = error as { status?: number; message?: string }
      if (err.status === 404) return response.notFound(fail(err.message ?? 'Not found'))
      if (err.status === 422) return response.unprocessableEntity(fail(err.message ?? 'Invalid cheque'))
      throw error
    }
  }

  async recordAda({ params, request, response, auth }: HttpContext) {
    try {
      const dv = await apDisbursementService.recordAdaPayment(
        actorOf(auth),
        params.id,
        request.body() as Record<string, unknown>
      )
      return response.ok(ok(dv, 'ADA payment recorded'))
    } catch (error) {
      const err = error as { status?: number; message?: string }
      if (err.status === 404) return response.notFound(fail(err.message ?? 'Not found'))
      if (err.status === 422) return response.unprocessableEntity(fail(err.message ?? 'Invalid ADA'))
      throw error
    }
  }

  async listCheques({ request, response, auth }: HttpContext) {
    const page = Number(request.input('page', 1)) || 1
    const limit = Math.min(Number(request.input('limit', 50)) || 50, 100)
    const result = await apDisbursementService.listCheques(auth.user!.organizationId, page, limit)
    return response.ok(ok(result.all(), 'Cheque register', { ...result.getMeta() }))
  }
}
