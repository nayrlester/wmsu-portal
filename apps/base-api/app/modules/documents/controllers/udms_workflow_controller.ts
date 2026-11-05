import type { HttpContext } from '@adonisjs/core/http'
import { udmsWorkflowService } from '#modules/documents/services/udms/udms_workflow_service'
import { DocumentSerializer } from '#presentation/documents/document_serializer'
import {
  assignUdmsDocumentValidator,
  listUdmsQueueValidator,
  routeUdmsDocumentValidator,
  udmsWorkflowActionValidator,
} from '#modules/documents/validators/udms_workflow'
import { ApprovalAction } from '#modules/documents/domain/enums/index'

export default class UdmsWorkflowController {
  async assignedQueue({ request, auth, response }: HttpContext) {
    const filters = await request.validateUsing(listUdmsQueueValidator, { data: request.qs() })
    const page = await udmsWorkflowService.listAssigned(auth.user!, filters)
    return response.ok(udmsWorkflowService.serializePage(page))
  }

  async officeQueue({ request, auth, response }: HttpContext) {
    const filters = await request.validateUsing(listUdmsQueueValidator, { data: request.qs() })
    const page = await udmsWorkflowService.listOfficeQueue(auth.user!, filters)
    return response.ok(udmsWorkflowService.serializePage(page))
  }

  async awaitingQueue({ request, auth, response }: HttpContext) {
    const filters = await request.validateUsing(listUdmsQueueValidator, { data: request.qs() })
    const page = await udmsWorkflowService.listAwaitingAction(auth.user!, filters)
    return response.ok(udmsWorkflowService.serializePage(page))
  }

  async tracking({ params, auth, response }: HttpContext) {
    const tracking = await udmsWorkflowService.getTracking(params.id, auth.user!)
    return response.ok(tracking)
  }

  async assign({ params, request, auth, response }: HttpContext) {
    const payload = await request.validateUsing(assignUdmsDocumentValidator)
    const document = await udmsWorkflowService.assign(params.id, payload, auth.user!)
    return response.ok(DocumentSerializer.serializeDetail(document))
  }

  async route({ params, request, auth, response }: HttpContext) {
    const payload = await request.validateUsing(routeUdmsDocumentValidator)
    const document = await udmsWorkflowService.route(params.id, payload, auth.user!)
    return response.ok(DocumentSerializer.serializeDetail(document))
  }

  async act({ params, request, auth, response }: HttpContext) {
    const payload = await request.validateUsing(udmsWorkflowActionValidator)
    const result = await udmsWorkflowService.act(
      params.id,
      {
        action: payload.action as ApprovalAction,
        comments: payload.comments ?? null,
        stepNodeId: payload.stepNodeId ?? null,
        toUserId: payload.toUserId ?? null,
        versionId: payload.versionId ?? null,
      },
      auth.user!
    )
    return response.ok({
      completed: result.completed,
      document: DocumentSerializer.serializeDetail(result.document),
      workflowInstance: result.instance
        ? {
            id: result.instance.id,
            status: result.instance.status,
            currentNodeId: result.instance.currentNodeId,
            activeNodeIds: result.instance.state?.activeNodeIds ?? [],
          }
        : null,
    })
  }
}
