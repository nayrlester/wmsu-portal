import type { HttpContext } from '@adonisjs/core/http'
import { udmsLifecycleService } from '#modules/documents/services/udms/udms_lifecycle_service'
import {
  applyUdmsRetentionValidator,
  createUdmsArchivalTransferValidator,
  createUdmsDisposalValidator,
  createUdmsVersionValidator,
  executeUdmsDisposalValidator,
  listUdmsLifecycleQueueValidator,
  restoreUdmsDocumentValidator,
  setUdmsLegalHoldValidator,
  setUdmsLifecycleValidator,
} from '#modules/documents/validators/udms_lifecycle'

export default class UdmsLifecycleController {
  async listVersions({ params, request, auth, response }: HttpContext) {
    const page = Math.min(Math.max(Number(request.input('page', 1)), 1), 1000)
    const limit = Math.min(Math.max(Number(request.input('limit', 25)), 1), 100)
    return response.ok(await udmsLifecycleService.listVersions(params.id, auth.user!, page, limit))
  }

  async createVersion({ params, request, auth, response }: HttpContext) {
    const payload = await request.validateUsing(createUdmsVersionValidator)
    const version = await udmsLifecycleService.createVersion(
      params.id,
      auth.user!,
      payload.changeNotes
    )
    return response.created(version)
  }

  async summary({ params, auth, response }: HttpContext) {
    return response.ok(await udmsLifecycleService.getLifecycleSummary(params.id, auth.user!))
  }

  async listArchived({ request, auth, response }: HttpContext) {
    const filters = await request.validateUsing(listUdmsLifecycleQueueValidator, {
      data: request.qs(),
    })
    return response.ok(await udmsLifecycleService.listArchived(auth.user!, filters))
  }

  async archive({ params, auth, response }: HttpContext) {
    return response.ok(await udmsLifecycleService.archive(params.id, auth.user!))
  }

  async restore({ params, request, auth, response }: HttpContext) {
    const payload = await request.validateUsing(restoreUdmsDocumentValidator)
    return response.ok(await udmsLifecycleService.restore(params.id, auth.user!, payload))
  }

  async listSchedules({ response }: HttpContext) {
    return response.ok(await udmsLifecycleService.listRetentionSchedules())
  }

  async applyRetention({ params, request, auth, response }: HttpContext) {
    const payload = await request.validateUsing(applyUdmsRetentionValidator)
    return response.ok(
      await udmsLifecycleService.applyRetention(params.id, auth.user!, payload.retentionScheduleId)
    )
  }

  async listRetentionDue({ request, auth, response }: HttpContext) {
    const filters = await request.validateUsing(listUdmsLifecycleQueueValidator, {
      data: request.qs(),
    })
    return response.ok(await udmsLifecycleService.listRetentionDue(auth.user!, filters))
  }

  async setLifecycle({ params, request, auth, response }: HttpContext) {
    const payload = await request.validateUsing(setUdmsLifecycleValidator)
    return response.ok(await udmsLifecycleService.setLifecycle(params.id, auth.user!, payload))
  }

  async setLegalHold({ params, request, auth, response }: HttpContext) {
    const payload = await request.validateUsing(setUdmsLegalHoldValidator)
    return response.ok(await udmsLifecycleService.setLegalHold(params.id, auth.user!, payload))
  }

  async listTransfers({ request, response }: HttpContext) {
    const filters = await request.validateUsing(listUdmsLifecycleQueueValidator, {
      data: request.qs(),
    })
    return response.ok(await udmsLifecycleService.listTransfers(filters))
  }

  async createTransfer({ request, auth, response }: HttpContext) {
    const payload = await request.validateUsing(createUdmsArchivalTransferValidator)
    return response.created(await udmsLifecycleService.createTransfer(payload, auth.user!))
  }

  async approveTransfer({ params, auth, response }: HttpContext) {
    return response.ok(await udmsLifecycleService.approveTransfer(params.id, auth.user!))
  }

  async completeTransfer({ params, auth, response }: HttpContext) {
    return response.ok(await udmsLifecycleService.completeTransfer(params.id, auth.user!))
  }

  async listDisposals({ request, response }: HttpContext) {
    const filters = await request.validateUsing(listUdmsLifecycleQueueValidator, {
      data: request.qs(),
    })
    return response.ok(await udmsLifecycleService.listDisposals(filters))
  }

  async createDisposal({ request, auth, response }: HttpContext) {
    const payload = await request.validateUsing(createUdmsDisposalValidator)
    return response.created(await udmsLifecycleService.createDisposal(payload, auth.user!))
  }

  async approveDisposal({ params, auth, response }: HttpContext) {
    return response.ok(await udmsLifecycleService.approveDisposal(params.id, auth.user!))
  }

  async executeDisposal({ params, request, auth, response }: HttpContext) {
    const payload = await request.validateUsing(executeUdmsDisposalValidator)
    return response.ok(
      await udmsLifecycleService.executeDisposal(params.id, auth.user!, payload.notes)
    )
  }
}
