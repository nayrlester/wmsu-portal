import type { HttpContext } from '@adonisjs/core/http'
import { tenantContext } from '#modules/documents/domain/tenant_context'
import { documentIntelligenceService } from '#modules/documents/services/document_intelligence_service'
import {
  analyzeDocumentIntelligenceValidator,
  correctIntelligenceMetadataValidator,
} from '#modules/documents/validators/intelligence'

export default class DocumentIntelligenceController {
  async analyze({ params, request, auth, response }: HttpContext) {
    const payload = await request.validateUsing(analyzeDocumentIntelligenceValidator)
    const tenantId = tenantContext.requireTenantId()

    const job = await documentIntelligenceService.enqueueAnalysis({
      tenantId,
      documentId: params.documentId,
      fileId: payload.fileId,
      tasks: payload.tasks,
      userId: auth.user!.id,
    })

    return response.accepted({
      jobId: job.id,
      status: job.status,
      tasks: job.tasks,
      ocrProvider: job.ocrProvider,
      aiProvider: job.aiProvider,
    })
  }

  async show({ params, auth, response }: HttpContext) {
    const intelligence = await documentIntelligenceService.getDocumentIntelligence(
      params.documentId,
      auth.user!.id
    )
    return response.ok(intelligence)
  }

  async jobStatus({ params, response }: HttpContext) {
    const job = await documentIntelligenceService.getJob(params.jobId)
    return response.ok(job)
  }

  async correctMetadata({ params, request, auth, response }: HttpContext) {
    const payload = await request.validateUsing(correctIntelligenceMetadataValidator)
    const intelligence = await documentIntelligenceService.correctMetadata(
      params.documentId,
      auth.user!.id,
      payload
    )
    return response.ok(intelligence)
  }
}
