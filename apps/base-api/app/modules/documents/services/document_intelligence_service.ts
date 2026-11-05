import app from '@adonisjs/core/services/app'
import env from '#start/env'
import { DateTime } from 'luxon'
import {
  DEFAULT_INTELLIGENCE_TASKS,
  IntelligenceJobStatus,
  IntelligenceTask,
  SupportedDocumentCategory,
  type IntelligenceAnalysisResult,
  type IntelligenceJobPayload,
} from '#modules/documents/domain/intelligence/intelligence_types'
import { tenantContext } from '#modules/documents/domain/tenant_context'
import { documentRepository } from '#infrastructure/repositories/document_repository'
import { documentFileRepository } from '#infrastructure/repositories/document_file_repository'
import { documentIntelligenceRepository } from '#infrastructure/repositories/document_intelligence_repository'
import { departmentRepository } from '#infrastructure/repositories/department_repository'
import { getStorageAdapter } from '#infrastructure/storage/storage_factory'
import { getAiProvider, getOcrProvider } from '#infrastructure/intelligence/provider_registry'
import { getIntelligenceQueue } from '#infrastructure/queue/queues'
import { planLimitService } from '#modules/documents/services/plan_limit_service'
import { PlanLimitExceededException } from '#modules/documents/domain/exceptions/tenant_exceptions'
import { DocumentAccessPolicy } from '#modules/documents/domain/documents/document_access_policy'
import { AuditAction } from '#modules/documents/domain/enums/index'
import { auditService } from '#modules/documents/services/audit_service'
import { meilisearchService } from '#infrastructure/search/meilisearch_service'
import type DocumentFile from '#modules/documents/models/document_file'

export class DocumentIntelligenceService {
  async enqueueAnalysis(input: {
    tenantId: string
    documentId: string
    fileId: string
    tasks?: IntelligenceTask[]
    userId: string
  }) {
    await this.assertIntelligenceEnabled(input.tenantId)
    await documentRepository.findByIdOrFail(input.documentId, input.userId)
    await documentFileRepository.findByIdOrFail(input.documentId, input.fileId)

    const tasks = input.tasks?.length ? input.tasks : DEFAULT_INTELLIGENCE_TASKS
    const ocrProvider = getOcrProvider()
    const aiProvider = getAiProvider()

    const job = await documentIntelligenceRepository.create({
      tenantId: input.tenantId,
      documentId: input.documentId,
      fileId: input.fileId,
      tasks,
      ocrProvider: ocrProvider.name,
      aiProvider: aiProvider.name,
    })

    const payload: IntelligenceJobPayload = {
      jobId: job.id,
      tenantId: input.tenantId,
      documentId: input.documentId,
      fileId: input.fileId,
      tasks,
    }

    if (this.shouldProcessSynchronously()) {
      await this.processJob(payload)
    } else {
      await getIntelligenceQueue().add(`intelligence:${job.id}`, payload, {
        jobId: job.id,
      })
    }

    return job
  }

  async processJob(payload: IntelligenceJobPayload): Promise<IntelligenceAnalysisResult> {
    return await tenantContext.run({ tenantId: payload.tenantId }, async () => {
      await documentIntelligenceRepository.markProcessing(payload.jobId)

      try {
        const file = await documentFileRepository.findByIdOrFail(payload.documentId, payload.fileId)
        const document = await documentRepository.findByIdOrFail(payload.documentId)
        const ocrProvider = getOcrProvider()
        const aiProvider = getAiProvider()
        const result: IntelligenceAnalysisResult = {
          processedAt: DateTime.now().toISO()!,
        }

        let text = this.extractExistingOcrText(file)

        if (payload.tasks.includes(IntelligenceTask.OCR) && !text) {
          const fileBuffer = await getStorageAdapter().read(file.s3Key)
          result.ocr = await ocrProvider.extractText({
            bucket: file.s3Bucket,
            key: file.s3Key,
            mimeType: file.mimeType,
            fileBuffer,
          })
          text = result.ocr.text
          await this.persistFileMetadata(file, result)
        }

        const analysisInput = {
          text: text ?? '',
          fileName: file.originalName,
          mimeType: file.mimeType,
        }

        let category = SupportedDocumentCategory.UNKNOWN

        if (payload.tasks.includes(IntelligenceTask.CLASSIFY)) {
          result.classification = await aiProvider.classify(analysisInput)
          category = result.classification.category
          document.aiClassification = {
            ...result.classification,
            provider: aiProvider.name,
            processedAt: result.processedAt,
          }
        } else if (document.aiClassification?.category) {
          category = document.aiClassification.category as SupportedDocumentCategory
        }

        if (payload.tasks.includes(IntelligenceTask.EXTRACT_METADATA)) {
          result.metadata = await aiProvider.extractMetadata(analysisInput, category)
        }

        if (payload.tasks.includes(IntelligenceTask.ROUTING_SUGGESTION)) {
          const departments = await departmentRepository.listActive()
          result.routingSuggestion = await aiProvider.suggestRouting(analysisInput, category, {
            departments: departments.map((department) => ({
              code: department.code ?? department.name,
              name: department.name,
            })),
          })
        }

        if (payload.tasks.includes(IntelligenceTask.SUMMARIZE)) {
          result.summary = await aiProvider.summarize(analysisInput, category)
          document.aiSummary = result.summary.summary
        }

        if (result.metadata?.fields) {
          document.metadata = {
            ...(document.metadata ?? {}),
            aiExtracted: result.metadata.fields,
            aiCategory: category,
          }
        }

        await documentRepository.save(document)
        await documentIntelligenceRepository.markCompleted(payload.jobId, result)
        return result
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Intelligence processing failed'
        await documentIntelligenceRepository.markFailed(payload.jobId, message)
        throw error
      }
    })
  }

  async getDocumentIntelligence(documentId: string, viewerUserId: string) {
    const [document, jobs] = await Promise.all([
      documentRepository.findByIdOrFail(documentId, viewerUserId),
      documentIntelligenceRepository.listByDocument(documentId),
    ])

    const latestCompleted = jobs.find((job) => job.status === IntelligenceJobStatus.COMPLETED)

    return {
      classification: document.aiClassification,
      summary: document.aiSummary,
      metadata: document.metadata,
      latestJob: latestCompleted
        ? {
            id: latestCompleted.id,
            status: latestCompleted.status,
            result: latestCompleted.result,
            completedAt: latestCompleted.completedAt,
          }
        : null,
      jobs: jobs.map((job) => ({
        id: job.id,
        status: job.status,
        tasks: job.tasks,
        ocrProvider: job.ocrProvider,
        aiProvider: job.aiProvider,
        errorMessage: job.errorMessage,
        createdAt: job.createdAt,
        completedAt: job.completedAt,
      })),
    }
  }

  async getJob(jobId: string) {
    const job = await documentIntelligenceRepository.findByIdOrFail(jobId)
    return {
      id: job.id,
      documentId: job.documentId,
      fileId: job.fileId,
      status: job.status,
      tasks: job.tasks,
      ocrProvider: job.ocrProvider,
      aiProvider: job.aiProvider,
      result: job.result,
      errorMessage: job.errorMessage,
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
    }
  }

  async correctMetadata(
    documentId: string,
    userId: string,
    input: {
      fields: Record<string, unknown>
      searchText?: string
    }
  ) {
    const document = await documentRepository.findByIdOrFail(documentId, userId)
    DocumentAccessPolicy.assertCanModify(document, userId)

    const previous = document.metadata
    const nextMetadata: Record<string, unknown> = {
      ...(document.metadata ?? {}),
      aiExtracted: {
        ...((document.metadata?.aiExtracted as Record<string, unknown> | undefined) ?? {}),
        ...input.fields,
      },
      aiCorrectedAt: new Date().toISOString(),
      aiCorrectedById: userId,
    }
    if (input.searchText !== undefined) {
      nextMetadata.correctedSearchText = input.searchText
    }
    document.metadata = nextMetadata
    await documentRepository.save(document)

    await auditService.log({
      tenantId: document.tenantId,
      userId,
      action: AuditAction.METADATA_CORRECT,
      entityType: 'document',
      entityId: document.id,
      oldValues: { metadata: previous },
      newValues: { metadata: nextMetadata },
    })

    try {
      await meilisearchService.syncDocument(document.tenantId, {
        id: document.id,
        title: document.title,
        trackingNumber: document.trackingNumber,
        status: document.status,
        snippet:
          input.searchText ??
          document.description ??
          Object.values(input.fields)
            .filter((v) => typeof v === 'string')
            .join(' '),
        matchField: 'content',
      })
    } catch {
      // Search reindex is best-effort
    }

    return this.getDocumentIntelligence(documentId, userId)
  }

  private async assertIntelligenceEnabled(tenantId: string): Promise<void> {
    const limits = await planLimitService.getLimits(tenantId)
    const hasOcr = planLimitService.hasFeature(limits, 'ocr')
    const hasAi = planLimitService.hasFeature(limits, 'ai')

    if (!hasOcr && !hasAi) {
      throw new PlanLimitExceededException('feature', 'OCR and AI features are not available on your plan')
    }
  }

  private shouldProcessSynchronously(): boolean {
    return app.inTest || env.get('QUEUE_SYNC') === true
  }

  private extractExistingOcrText(file: DocumentFile): string | null {
    const metadata = file.extractedMetadata as { searchText?: string; ocr?: { text?: string } } | null
    return metadata?.searchText ?? metadata?.ocr?.text ?? null
  }

  private async persistFileMetadata(file: DocumentFile, result: IntelligenceAnalysisResult) {
    const existingText = this.extractExistingOcrText(file)
    const incomingText = result.ocr?.text?.trim() ?? ''
    const bestText =
      incomingText.length > (existingText?.trim().length ?? 0) ? incomingText : existingText ?? incomingText

    const metadata = {
      ...(file.extractedMetadata ?? {}),
      ...(bestText ? { searchText: bestText } : {}),
      ocr: {
        ...(result.ocr ?? {}),
        text: bestText || result.ocr?.text,
      },
      ai: {
        classification: result.classification,
        metadata: result.metadata,
        routingSuggestion: result.routingSuggestion,
        summary: result.summary,
      },
    }

    await documentFileRepository.updateExtractedMetadata(file.id, metadata)
  }
}

export const documentIntelligenceService = new DocumentIntelligenceService()

export async function processDocumentIntelligenceJob(payload: IntelligenceJobPayload): Promise<void> {
  await documentIntelligenceService.processJob(payload)
}
