import type { HttpContext } from '@adonisjs/core/http'
import { fail } from '#modules/finance/helpers/api_envelope'
import { officialFormsService } from '#modules/finance/services/ufms/official_forms_service'

export default class OfficialFormsController {
  async officialReceipt({ params, request, response, auth }: HttpContext) {
    try {
      const format = String(request.input('format', 'html')) === 'pdf' ? 'pdf' : 'html'
      const file = await officialFormsService.officialReceipt(auth.user!.organizationId, params.id, format)
      response.header('Content-Type', file.contentType)
      response.header('Content-Disposition', `inline; filename="${file.filename}"`)
      return response.send(file.body)
    } catch (error) {
      const err = error as { status?: number; message?: string }
      if (err.status === 404) return response.notFound(fail(err.message ?? 'Not found'))
      throw error
    }
  }

  async disbursementVoucher({ params, request, response, auth }: HttpContext) {
    try {
      const format = String(request.input('format', 'html')) === 'pdf' ? 'pdf' : 'html'
      const file = await officialFormsService.disbursementVoucher(auth.user!.organizationId, params.id, format)
      response.header('Content-Type', file.contentType)
      response.header('Content-Disposition', `inline; filename="${file.filename}"`)
      return response.send(file.body)
    } catch (error) {
      const err = error as { status?: number; message?: string }
      if (err.status === 404) return response.notFound(fail(err.message ?? 'Not found'))
      throw error
    }
  }

  async budgetPlan({ params, response, auth }: HttpContext) {
    try {
      const file = await officialFormsService.budgetPlan(auth.user!.organizationId, params.id)
      response.header('Content-Type', file.contentType)
      response.header('Content-Disposition', `inline; filename="${file.filename}"`)
      return response.send(file.body)
    } catch (error) {
      const err = error as { status?: number; message?: string }
      if (err.status === 404) return response.notFound(fail(err.message ?? 'Not found'))
      throw error
    }
  }

  async bfarPack({ request, response, auth }: HttpContext) {
    const file = await officialFormsService.bfarPack(auth.user!.organizationId, request.input('fiscalYear'))
    response.header('Content-Type', file.contentType)
    response.header('Content-Disposition', `inline; filename="${file.filename}"`)
    return response.send(file.body)
  }

  async birWithholding({ response, auth }: HttpContext) {
    const file = await officialFormsService.birWithholding(auth.user!.organizationId)
    response.header('Content-Type', file.contentType)
    response.header('Content-Disposition', `attachment; filename="${file.filename}"`)
    return response.send(file.body)
  }

  async agencyCsv({ params, response, auth }: HttpContext) {
    const agency = String(params.agency ?? '') as 'ebudget' | 'btms' | 'engas'
    if (!['ebudget', 'btms', 'engas'].includes(agency)) {
      return response.notFound(fail('Unknown agency export'))
    }
    const file = await officialFormsService.agencyCsv(auth.user!.organizationId, agency)
    response.header('Content-Type', file.contentType)
    response.header('Content-Disposition', `attachment; filename="${file.filename}"`)
    return response.send(file.body)
  }
}
