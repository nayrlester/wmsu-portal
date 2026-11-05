import type { HttpContext } from '@adonisjs/core/http'
import { udmsRepositoryService } from '#modules/documents/services/udms/udms_repository_service'
import { udmsFilePlanService } from '#modules/documents/services/udms/udms_file_plan_service'
import {
  createFilePlanNodeValidator,
  listUdmsRepositoryValidator,
  registerUdmsDocumentValidator,
  updateFilePlanNodeValidator,
  updateUdmsMetadataValidator,
} from '#modules/documents/validators/udms_repository'

export default class UdmsRepositoryController {
  async list({ request, auth, response }: HttpContext) {
    const filters = await request.validateUsing(listUdmsRepositoryValidator, {
      data: request.qs(),
    })
    const page = await udmsRepositoryService.list(filters, auth.user!.id)
    return response.ok(udmsRepositoryService.serializePage(page))
  }

  async register({ request, auth, response }: HttpContext) {
    const payload = await request.validateUsing(registerUdmsDocumentValidator)
    const document = await udmsRepositoryService.register(payload, auth.user!)
    return response.created(udmsRepositoryService.serialize(document))
  }

  async show({ params, auth, response }: HttpContext) {
    const document = await udmsRepositoryService.show(params.id, auth.user!)
    return response.ok(udmsRepositoryService.serialize(document))
  }

  async updateMetadata({ params, request, auth, response }: HttpContext) {
    const payload = await request.validateUsing(updateUdmsMetadataValidator)
    const document = await udmsRepositoryService.updateMetadata(params.id, payload, auth.user!)
    return response.ok(udmsRepositoryService.serialize(document))
  }

  async listFilePlan({ request, response }: HttpContext) {
    const parentId = request.input('parentId') as string | undefined
    const rootsOnly = request.input('rootsOnly') === 'true' || request.input('rootsOnly') === true
    const nodes = await udmsFilePlanService.list(
      rootsOnly ? null : parentId === undefined ? undefined : parentId || null
    )
    return response.ok(
      nodes.map((node) => ({
        id: node.id,
        parentId: node.parentId,
        name: node.name,
        code: node.code,
        path: node.path,
        sortOrder: node.sortOrder,
        isActive: node.isActive,
      }))
    )
  }

  async createFilePlan({ request, auth, response }: HttpContext) {
    const payload = await request.validateUsing(createFilePlanNodeValidator)
    const node = await udmsFilePlanService.create(payload, auth.user!.id)
    return response.created({
      id: node.id,
      parentId: node.parentId,
      name: node.name,
      code: node.code,
      path: node.path,
      sortOrder: node.sortOrder,
      isActive: node.isActive,
    })
  }

  async updateFilePlan({ params, request, auth, response }: HttpContext) {
    const payload = await request.validateUsing(updateFilePlanNodeValidator)
    const node = await udmsFilePlanService.update(params.id, payload, auth.user!.id)
    return response.ok({
      id: node.id,
      parentId: node.parentId,
      name: node.name,
      code: node.code,
      path: node.path,
      sortOrder: node.sortOrder,
      isActive: node.isActive,
    })
  }

  async destroyFilePlan({ params, auth, response }: HttpContext) {
    await udmsFilePlanService.softDelete(params.id, auth.user!.id)
    return response.ok({ message: 'File-plan node deleted' })
  }
}
