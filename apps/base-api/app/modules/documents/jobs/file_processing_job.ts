import type { FileProcessingJobPayload } from '#modules/documents/domain/files/file_processing_types'
import { tenantContext } from '#modules/documents/domain/tenant_context'
import { documentFileRepository } from '#modules/documents/infrastructure/repositories/document_file_repository'
import { getStorageAdapter } from '#infrastructure/storage/storage_factory'
import { fileSearchIndexService } from '#modules/documents/services/file_search_index_service'
import { virusScanService } from '#modules/documents/services/virus_scan_service'
import { VirusDetectedException } from '#modules/documents/domain/files/file_exceptions'

export class FileProcessingService {
  async processJob(payload: FileProcessingJobPayload): Promise<void> {
    await tenantContext.run({ tenantId: payload.tenantId }, async () => {
      const file = await documentFileRepository.findByIdOrFail(payload.documentId, payload.fileId)
      if (file.virusScanned && file.virusClean) {
        return
      }

      const buffer = await getStorageAdapter().read(file.s3Key)
      const scanResult = await virusScanService.scan(file, buffer)

      if (!scanResult.clean) {
        await getStorageAdapter().delete(file.s3Key)
        await documentFileRepository.softDelete(file)
        throw new VirusDetectedException()
      }

      await documentFileRepository.updateVirusScanResult(file.id, true, true)

      try {
        await fileSearchIndexService.indexFromBuffer(file, buffer)
      } catch {
      }
    })
  }
}

export const fileProcessingService = new FileProcessingService()

export async function processFileProcessing(payload: FileProcessingJobPayload): Promise<void> {
  await fileProcessingService.processJob(payload)
}
