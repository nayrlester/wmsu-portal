import type { HttpContext } from '@adonisjs/core/http'
import {
  approveDisposalValidator,
  createDisposalValidator,
  createTransferValidator,
  executeDisposalValidator,
  listArchivesValidator,
  setLegalHoldValidator,
} from '#modules/documents/validators/archives'
import { archivesService } from '#modules/documents/services/archives_service'

export default class ArchivesController {
  async setLegalHold({ params, request, auth, response }: HttpContext) {
    const payload = await request.validateUsing(setLegalHoldValidator)
    const data = await archivesService.setLegalHold(params.documentId, payload, auth.user!)
    return response.ok({ data })
  }

  async listTransfers({ request, response }: HttpContext) {
    const filters = await request.validateUsing(listArchivesValidator, { data: request.qs() })
    return response.ok(await archivesService.listTransfers(filters))
  }

  async showTransfer({ params, response }: HttpContext) {
    return response.ok({ data: await archivesService.showTransfer(params.id) })
  }

  async createTransfer({ request, auth, response }: HttpContext) {
    const payload = await request.validateUsing(createTransferValidator)
    const data = await archivesService.createTransfer(payload, auth.user!)
    return response.created({ data })
  }

  async approveTransfer({ params, auth, response }: HttpContext) {
    const data = await archivesService.approveTransfer(params.id, auth.user!)
    return response.ok({ data })
  }

  async completeTransfer({ params, auth, response }: HttpContext) {
    const data = await archivesService.completeTransfer(params.id, auth.user!)
    return response.ok({ data })
  }

  async listDisposals({ request, response }: HttpContext) {
    const filters = await request.validateUsing(listArchivesValidator, { data: request.qs() })
    return response.ok(await archivesService.listDisposals(filters))
  }

  async showDisposal({ params, response }: HttpContext) {
    return response.ok({ data: await archivesService.showDisposal(params.id) })
  }

  async createDisposal({ request, auth, response }: HttpContext) {
    const payload = await request.validateUsing(createDisposalValidator)
    const data = await archivesService.createDisposal(payload, auth.user!)
    return response.created({ data })
  }

  async approveDisposal({ params, request, auth, response }: HttpContext) {
    await request.validateUsing(approveDisposalValidator)
    const data = await archivesService.approveDisposal(params.id, auth.user!)
    return response.ok({ data })
  }

  async executeDisposal({ params, request, auth, response }: HttpContext) {
    const payload = await request.validateUsing(executeDisposalValidator)
    const data = await archivesService.executeDisposal(params.id, auth.user!, payload.notes)
    return response.ok({ data })
  }
}
