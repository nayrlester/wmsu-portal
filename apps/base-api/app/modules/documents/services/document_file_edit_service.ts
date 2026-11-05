import { Document as DocxDocument, Packer, Paragraph, TextRun } from 'docx'
import mammoth from 'mammoth'
import * as XLSX from 'xlsx'
import { DocumentPolicy } from '#modules/documents/domain/documents/document_policy'
import { DocumentAccessPolicy } from '#modules/documents/domain/documents/document_access_policy'
import { DocumentVersionPolicy } from '#modules/documents/domain/documents/document_version_policy'
import { FileNotFoundException, FileUploadNotAllowedException } from '#modules/documents/domain/files/file_exceptions'
import type { AllowedMimeType } from '#modules/documents/domain/files/file_constants'
import { resolveFileEditFormat, type ResolvedFileEditFormat } from '#modules/documents/domain/files/file_edit_format'
import { documentRepository } from '#infrastructure/repositories/document_repository'
import { documentFileRepository } from '#infrastructure/repositories/document_file_repository'
import { documentVersionRepository } from '#infrastructure/repositories/document_version_repository'
import { getStorageAdapter } from '#infrastructure/storage/storage_factory'
import { documentFileService } from '#modules/documents/services/document_file_service'
import { fileTextExtractor } from '#infrastructure/files/file_text_extractor'
import { fileSearchIndexService } from '#modules/documents/services/file_search_index_service'
import type DocumentFile from '#modules/documents/models/document_file'

export interface FileEditSheet {
  name: string
  csv: string
}

export interface FileEditPayload {
  fileId: string
  originalName: string
  mimeType: string
  outputFileName: string
  outputMimeType: string
  mode: 'text' | 'spreadsheet' | 'extracted_text'
  preservesOriginalFile?: boolean
  content?: string
  sheets?: FileEditSheet[]
}

export class DocumentFileEditService {
  /** View-only formatted HTML for .docx (avoids browser CORS on signed storage URLs). */
  async getHtmlPreview(
    documentId: string,
    fileId: string,
    viewerUserId: string
  ): Promise<{ html: string; originalName: string; mimeType: string }> {
    const file = await documentFileRepository.findByIdOrFail(documentId, fileId)
    const document = await documentRepository.findByIdOrFail(documentId, viewerUserId)
    const version = await documentVersionRepository.findById(documentId, file.versionId)
    if (!version) {
      throw new FileNotFoundException('Document version not found')
    }
    DocumentAccessPolicy.assertCanViewVersion(version, document, viewerUserId)

    const lower = file.originalName.toLowerCase()
    const isDocx =
      file.mimeType ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      lower.endsWith('.docx')

    if (!isDocx) {
      throw new FileUploadNotAllowedException('HTML preview is only available for Word (.docx) files')
    }

    const buffer = await this.readFileBuffer(file)
    const result = await mammoth.convertToHtml({ buffer })
    return {
      html: result.value ?? '',
      originalName: file.originalName,
      mimeType: file.mimeType,
    }
  }

  async getEditPayload(documentId: string, fileId: string, viewerUserId: string): Promise<FileEditPayload> {
    const file = await documentFileRepository.findByIdOrFail(documentId, fileId)
    const document = await documentRepository.findByIdOrFail(documentId, viewerUserId)
    const version = await documentVersionRepository.findById(documentId, file.versionId)
    if (!version) {
      throw new FileUploadNotAllowedException('Document version not found')
    }
    DocumentAccessPolicy.assertCanViewVersion(version, document, viewerUserId)
    DocumentPolicy.assertCanModifyVersionContent(document.status)
    DocumentVersionPolicy.assertCanBranchFrom(version.status)

    const format = resolveFileEditFormat(file)
    if (!format) {
      throw new FileUploadNotAllowedException('This file type cannot be edited in the browser')
    }

    if (format.descriptor.mode === 'extracted_text') {
      const cached = fileSearchIndexService.getSearchText(file)
      if (cached?.trim()) {
        return this.buildTextPayload(file, format, cached)
      }
    }

    const buffer = await this.readFileBuffer(file)

    if (format.descriptor.mode === 'spreadsheet') {
      const workbook = XLSX.read(buffer, { type: 'buffer' })
      const sheets = workbook.SheetNames.map((name) => {
        const sheet = workbook.Sheets[name]
        return {
          name,
          csv: sheet ? XLSX.utils.sheet_to_csv(sheet, { blankrows: false }) : '',
        }
      })

      return {
        fileId: file.id,
        originalName: file.originalName,
        mimeType: file.mimeType,
        outputFileName: format.outputFileName,
        outputMimeType: format.outputMimeType,
        mode: 'spreadsheet',
        preservesOriginalFile: format.preserveBinary,
        sheets,
      }
    }

    let content = ''
    if (format.descriptor.mode === 'extracted_text') {
      content = await this.resolveExtractedText(file, buffer)
      if (!content.trim()) {
        throw new FileUploadNotAllowedException(
          'No text could be extracted from this file yet. Wait for processing to finish or upload a text-based file.'
        )
      }
    } else if (
      format.sourceMimeType === 'text/plain' ||
      format.sourceMimeType === 'text/csv'
    ) {
      content = buffer.toString('utf8')
    } else if (
      format.sourceMimeType ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      const result = await mammoth.extractRawText({ buffer })
      content = result.value ?? ''
    } else {
      content = await fileTextExtractor.extract(buffer, format.sourceMimeType, file.originalName)
    }

    return this.buildTextPayload(file, format, content)
  }

  private buildTextPayload(
    file: DocumentFile,
    format: ResolvedFileEditFormat,
    content: string
  ): FileEditPayload {
    return {
      fileId: file.id,
      originalName: file.originalName,
      mimeType: file.mimeType,
      outputFileName: format.outputFileName,
      outputMimeType: format.outputMimeType,
      mode: format.descriptor.mode,
      preservesOriginalFile: format.preserveBinary,
      content,
    }
  }

  private async readFileBuffer(file: DocumentFile): Promise<Buffer> {
    const buffer = await this.tryReadFileBuffer(file)
    if (buffer) return buffer

    throw new FileNotFoundException(
      'File content is not available in storage. Re-upload the file or replace it.'
    )
  }

  private async tryReadFileBuffer(file: DocumentFile): Promise<Buffer | null> {
    try {
      return await getStorageAdapter().read(file.s3Key)
    } catch {
      return null
    }
  }

  private async resolveExtractedText(file: DocumentFile, buffer: Buffer): Promise<string> {
    const edited = fileSearchIndexService.getSearchText(file)
    if (edited?.trim()) {
      return edited
    }

    try {
      const extracted = await fileTextExtractor.extract(buffer, file.mimeType, file.originalName)
      if (extracted.trim()) {
        return extracted
      }

      const reindexed = await fileSearchIndexService.indexFromBuffer(file, buffer)
      if (reindexed.indexed) {
        return fileSearchIndexService.getSearchText(file) ?? ''
      }
    } catch {
      // Fall through to empty — caller returns a 422 with a clear message.
    }

    return ''
  }

  async saveEdit(
    documentId: string,
    fileId: string,
    userId: string,
    input: { content?: string; sheets?: FileEditSheet[]; changeNotes?: string }
  ) {
    const file = await documentFileRepository.findByIdOrFail(documentId, fileId)
    const format = resolveFileEditFormat(file)
    if (!format) {
      throw new FileUploadNotAllowedException('This file type cannot be edited in the browser')
    }

    const textContent = input.content ?? ''
    const originalBuffer = await this.tryReadFileBuffer(file)

    if (!originalBuffer) {
      if (format.preserveBinary && textContent.trim()) {
        await fileSearchIndexService.persistUserEditedText(file, textContent)
        return { file, version: null, metadataOnly: true as const }
      }

      throw new FileNotFoundException(
        'File content is not available in storage. Re-upload the file or replace it.'
      )
    }

    const buffer = await this.buildBuffer(format, input, originalBuffer)
    const notes =
      input.changeNotes?.trim() || `Edited "${file.originalName}" in browser`

    const result = await documentFileService.replaceFromBuffer(
      documentId,
      fileId,
      buffer,
      format.outputFileName,
      format.outputMimeType,
      userId,
      notes
    )

    await this.syncEditedContentMetadata(result.file, format, input, buffer)

    return { ...result, metadataOnly: false as const }
  }

  private async syncEditedContentMetadata(
    file: DocumentFile,
    format: ResolvedFileEditFormat,
    input: { content?: string; sheets?: FileEditSheet[] },
    buffer: Buffer
  ): Promise<void> {
    const textContent = this.extractTextForIndex(format, input)

    if (format.preserveBinary) {
      if (textContent.trim()) {
        await fileSearchIndexService.persistUserEditedText(file, textContent)
      }
      return
    }

    if (textContent.trim()) {
      await fileSearchIndexService.persistUserEditedText(file, textContent)
    }

    try {
      await fileSearchIndexService.indexFromBuffer(file, buffer)
    } catch {
      // Search indexing must not block saves.
    }
  }

  private extractTextForIndex(
    format: ResolvedFileEditFormat,
    input: { content?: string; sheets?: FileEditSheet[] }
  ): string {
    if (format.descriptor.mode === 'spreadsheet') {
      return (input.sheets ?? []).map((sheet) => sheet.csv).join('\n')
    }

    return input.content ?? ''
  }

  private async buildBuffer(
    format: ResolvedFileEditFormat,
    input: { content?: string; sheets?: FileEditSheet[] },
    originalBuffer: Buffer
  ): Promise<Buffer> {
    if (format.descriptor.mode === 'spreadsheet') {
      const sheets = input.sheets ?? []
      const workbook = XLSX.utils.book_new()
      for (const sheet of sheets) {
        const imported = XLSX.read(sheet.csv, { type: 'string' })
        const firstName = imported.SheetNames[0]
        const worksheet = firstName ? imported.Sheets[firstName] : XLSX.utils.aoa_to_sheet([])
        XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name.slice(0, 31) || 'Sheet1')
      }
      const bookType =
        format.outputMimeType === 'application/vnd.ms-excel' ? 'xls' : 'xlsx'
      return Buffer.from(XLSX.write(workbook, { type: 'buffer', bookType }))
    }

    const content = input.content ?? ''

    if (format.descriptor.mode === 'extracted_text' || format.preserveBinary) {
      return originalBuffer
    }

    if (
      format.outputMimeType === 'text/plain' ||
      format.outputMimeType === 'text/csv'
    ) {
      return Buffer.from(content, 'utf8')
    }

    if (
      format.outputMimeType ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      return this.buildDocxBuffer(content)
    }

    return Buffer.from(content, 'utf8')
  }

  private async buildDocxBuffer(content: string): Promise<Buffer> {
    const doc = new DocxDocument({
      sections: [
        {
          children: content
            .split(/\r?\n/)
            .map((line) => new Paragraph({ children: [new TextRun(line)] })),
        },
      ],
    })
    return Buffer.from(await Packer.toBuffer(doc))
  }
}

export const documentFileEditService = new DocumentFileEditService()
