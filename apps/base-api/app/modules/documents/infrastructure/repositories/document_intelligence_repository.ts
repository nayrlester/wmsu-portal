import { DateTime } from 'luxon'
import DocumentIntelligenceJob from '#modules/documents/models/document_intelligence_job'
import { tenantContext } from '#modules/documents/domain/tenant_context'
import { IntelligenceJobStatus, type IntelligenceTask } from '#modules/documents/domain/intelligence/intelligence_types'
import type { IntelligenceAnalysisResult } from '#modules/documents/domain/intelligence/intelligence_types'

export class DocumentIntelligenceRepository {
  async create(data: {
    tenantId: string
    documentId: string
    fileId: string
    tasks: IntelligenceTask[]
    ocrProvider: string
    aiProvider: string
  }): Promise<DocumentIntelligenceJob> {
    return DocumentIntelligenceJob.create({
      tenantId: data.tenantId,
      documentId: data.documentId,
      fileId: data.fileId,
      tasks: data.tasks,
      ocrProvider: data.ocrProvider,
      aiProvider: data.aiProvider,
      status: IntelligenceJobStatus.PENDING,
    })
  }

  async findByIdOrFail(jobId: string): Promise<DocumentIntelligenceJob> {
    const tenantId = tenantContext.requireTenantId()
    return DocumentIntelligenceJob.query()
      .where('tenant_id', tenantId)
      .where('id', jobId)
      .firstOrFail()
  }

  async findLatestByDocument(documentId: string): Promise<DocumentIntelligenceJob | null> {
    const tenantId = tenantContext.requireTenantId()
    return DocumentIntelligenceJob.query()
      .where('tenant_id', tenantId)
      .where('document_id', documentId)
      .orderBy('created_at', 'desc')
      .first()
  }

  async listByDocument(documentId: string): Promise<DocumentIntelligenceJob[]> {
    const tenantId = tenantContext.requireTenantId()
    return DocumentIntelligenceJob.query()
      .where('tenant_id', tenantId)
      .where('document_id', documentId)
      .orderBy('created_at', 'desc')
  }

  async markProcessing(jobId: string): Promise<void> {
    await DocumentIntelligenceJob.query().where('id', jobId).update({
      status: IntelligenceJobStatus.PROCESSING,
      started_at: DateTime.now().toSQL(),
      error_message: null,
    })
  }

  async markCompleted(jobId: string, result: IntelligenceAnalysisResult): Promise<void> {
    await DocumentIntelligenceJob.query().where('id', jobId).update({
      status: IntelligenceJobStatus.COMPLETED,
      result,
      completed_at: DateTime.now().toSQL(),
      error_message: null,
    })
  }

  async markFailed(jobId: string, errorMessage: string): Promise<void> {
    await DocumentIntelligenceJob.query().where('id', jobId).update({
      status: IntelligenceJobStatus.FAILED,
      error_message: errorMessage,
      completed_at: DateTime.now().toSQL(),
    })
  }
}

export const documentIntelligenceRepository = new DocumentIntelligenceRepository()
