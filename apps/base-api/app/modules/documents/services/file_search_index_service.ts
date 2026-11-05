import { DateTime } from 'luxon'
import { fileTextExtractor } from '#infrastructure/files/file_text_extractor'
import { documentFileRepository } from '#infrastructure/repositories/document_file_repository'
import { getStorageAdapter } from '#infrastructure/storage/storage_factory'
import type DocumentFile from '#modules/documents/models/document_file'

export interface FileSearchIndexResult {
  indexed: boolean
  textLength: number
  provider: string
}

export class FileSearchIndexService {
  async indexFromBuffer(file: DocumentFile, buffer: Buffer): Promise<FileSearchIndexResult> {
    const text = await fileTextExtractor.extract(buffer, file.mimeType, file.originalName)

    if (!text.trim()) {
      return { indexed: false, textLength: 0, provider: 'none' }
    }

    await this.persistSearchText(file, text, 'local_extractor')
    return { indexed: true, textLength: text.length, provider: 'local_extractor' }
  }

  async indexFromStorage(file: DocumentFile): Promise<FileSearchIndexResult> {
    const buffer = await getStorageAdapter().read(file.s3Key)
    return this.indexFromBuffer(file, buffer)
  }

  async reindexFile(documentId: string, fileId: string): Promise<FileSearchIndexResult> {
    const file = await documentFileRepository.findByIdOrFail(documentId, fileId)
    return this.indexFromStorage(file)
  }

  getSearchText(file: DocumentFile): string | null {
    const metadata = file.extractedMetadata as {
      editedText?: string
      searchText?: string
      ocr?: { text?: string }
    } | null

    return metadata?.editedText ?? metadata?.searchText ?? metadata?.ocr?.text ?? null
  }

  async persistUserEditedText(file: DocumentFile, text: string): Promise<void> {
    const metadata = {
      ...(file.extractedMetadata ?? {}),
      editedText: text,
      userEdited: true,
      searchText: text,
      searchIndexedAt: DateTime.now().toISO(),
      ocr: {
        ...((file.extractedMetadata as { ocr?: Record<string, unknown> } | null)?.ocr ?? {}),
        text,
        provider: 'user_edit',
        confidence: 100,
      },
    }

    await documentFileRepository.updateExtractedMetadata(file.id, metadata)
    file.extractedMetadata = metadata
  }

  private async persistSearchText(file: DocumentFile, text: string, provider: string) {
    const metadata = {
      ...(file.extractedMetadata ?? {}),
      searchText: text,
      searchIndexedAt: DateTime.now().toISO(),
      ocr: {
        ...((file.extractedMetadata as { ocr?: Record<string, unknown> } | null)?.ocr ?? {}),
        text,
        provider,
        confidence: 100,
      },
    }

    await documentFileRepository.updateExtractedMetadata(file.id, metadata)
    file.extractedMetadata = metadata
  }
}

export const fileSearchIndexService = new FileSearchIndexService()
