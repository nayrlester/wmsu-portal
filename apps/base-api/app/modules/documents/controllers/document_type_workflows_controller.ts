import type { HttpContext } from '@adonisjs/core/http'
import { workflowEngineService } from '#modules/documents/services/workflow_engine_service'
import { assignWorkflowValidator } from '#modules/documents/validators/workflow'

export default class DocumentTypeWorkflowsController {
  async assign({ params, request, response }: HttpContext) {
    const { workflowId } = await request.validateUsing(assignWorkflowValidator)
    const documentType = await workflowEngineService.assignWorkflowToDocumentType(
      params.documentTypeId,
      workflowId
    )

    return response.ok({
      message: 'Default workflow assigned to document type',
      documentType: {
        id: documentType.id,
        name: documentType.name,
        code: documentType.code,
        defaultWorkflowId: documentType.defaultWorkflowId,
      },
    })
  }
}
