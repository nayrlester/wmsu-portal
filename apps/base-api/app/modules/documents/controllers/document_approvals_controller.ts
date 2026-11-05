import type { HttpContext } from '@adonisjs/core/http'
import { workflowEngineService } from '#modules/documents/services/workflow_engine_service'
import { approvalService } from '#modules/documents/services/approval_service'
import { DocumentSerializer } from '#presentation/documents/document_serializer'
import { documentApprovalValidator, activityFeedValidator, bulkApprovalValidator } from '#modules/documents/validators/approval'
import { ApprovalAction } from '#modules/documents/domain/enums/index'

export default class DocumentApprovalsController {
  async workflowState({ params, auth, response }: HttpContext) {
    const state = await workflowEngineService.getDocumentWorkflowState(params.documentId, auth.user!)
    return response.ok(state)
  }

  async timeline({ params, auth, response }: HttpContext) {
    const result = await approvalService.getTimeline(params.documentId, auth.user!.id)
    return response.ok(result)
  }

  async approvals({ params, auth, response }: HttpContext) {
    const result = await approvalService.getApprovalHistory(params.documentId, auth.user!.id)
    return response.ok(result)
  }

  async activity({ params, request, auth, response }: HttpContext) {
    const { limit } = await request.validateUsing(activityFeedValidator, {
      data: request.qs(),
    })
    const result = await approvalService.getActivityFeed(params.documentId, auth.user!.id, limit)
    return response.ok(result)
  }

  async act({ params, request, auth, response }: HttpContext) {
    const payload = await request.validateUsing(documentApprovalValidator)
    const result = await approvalService.processAction({
      documentId: params.documentId,
      userId: auth.user!.id,
      action: payload.action as ApprovalAction,
      comments: payload.comments ?? null,
      stepNodeId: payload.stepNodeId ?? null,
      toUserId: payload.toUserId ?? null,
      versionId: payload.versionId ?? null,
    })

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

  async bulkAct({ request, auth, response }: HttpContext) {
    const payload = await request.validateUsing(bulkApprovalValidator)
    const result = await approvalService.processBulk({
      documentIds: payload.documentIds,
      userId: auth.user!.id,
      action: payload.action as ApprovalAction,
      comments: payload.comments ?? null,
    })
    return response.ok(result)
  }
}
