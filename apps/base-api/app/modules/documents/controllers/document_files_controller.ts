import type { HttpContext } from '@adonisjs/core/http'
import env from '#start/env'
import { formatVersionLabel } from '#modules/documents/domain/documents/document_version_label'
import { documentFileService } from '#modules/documents/services/document_file_service'
import { documentFileEditService } from '#modules/documents/services/document_file_edit_service'
import { replaceFileValidator, saveFileEditValidator } from '#modules/documents/validators/document_file'
import { documentRepository } from '#infrastructure/repositories/document_repository'
import { DocumentConfidentialityPolicy } from '#modules/documents/domain/documents/document_confidentiality_policy'
import { tenantContext } from '#modules/documents/domain/tenant_context'

export default class DocumentFilesController {
  async index({ params, request, auth, response }: HttpContext) {
    const files = await documentFileService.list(
      params.documentId,
      auth.user!.id,
      request.input('versionId')
    )
    return response.ok({ files })
  }

  async store({ params, request, auth, response }: HttpContext) {
    // Size only — do not use Adonis extnames. Magic-byte sniff marks .docx/.xlsx/.pptx as "zip".
    const uploadFile = request.file('file', {
      size: `${env.get('FILE_MAX_SIZE_MB') ?? 25}mb`,
    })

    if (!uploadFile) {
      return response.badRequest({ error: 'File is required' })
    }

    const metadataRaw = request.input('metadata')
    let metadata: Record<string, unknown> | undefined
    if (metadataRaw) {
      metadata = typeof metadataRaw === 'string' ? JSON.parse(metadataRaw) : metadataRaw
    }

    const file = await documentFileService.upload(
      params.documentId,
      params.versionId,
      uploadFile,
      auth.user!.id,
      metadata
    )

    return response.created({
      id: file.id,
      versionId: file.versionId,
      originalName: file.originalName,
      mimeType: file.mimeType,
      fileSize: file.fileSize,
      checksum: file.checksum,
      virusScanned: file.virusScanned,
      virusClean: file.virusClean,
      extractedMetadata: file.extractedMetadata,
      createdAt: file.createdAt,
    })
  }

  async presign({ params, request, auth, response }: HttpContext) {
    const body = request.only(['fileName', 'mimeType', 'fileSize'])
    const result = await documentFileService.createPresignedUpload(
      params.documentId,
      params.versionId,
      auth.user!.id,
      {
        fileName: String(body.fileName ?? ''),
        mimeType: String(body.mimeType ?? 'application/octet-stream'),
        fileSize: Number(body.fileSize ?? 0),
      }
    )
    return response.ok(result)
  }

  async completePresigned({ params, request, auth, response }: HttpContext) {
    const body = request.only(['storageKey', 'originalName', 'mimeType', 'fileSize', 'checksum'])
    const file = await documentFileService.completePresignedUpload(
      params.documentId,
      params.versionId,
      auth.user!.id,
      {
        storageKey: String(body.storageKey),
        originalName: String(body.originalName),
        mimeType: String(body.mimeType),
        fileSize: Number(body.fileSize),
        checksum: body.checksum ? String(body.checksum) : undefined,
      }
    )
    return response.created({
      id: file.id,
      versionId: file.versionId,
      originalName: file.originalName,
      mimeType: file.mimeType,
      fileSize: file.fileSize,
      virusScanned: file.virusScanned,
      createdAt: file.createdAt,
    })
  }

  async download({ params, auth, response }: HttpContext) {
    const document = await documentRepository.findByIdOrFail(params.documentId, auth.user!.id)
    await DocumentConfidentialityPolicy.assertCanDownload(
      document,
      auth.user!,
      tenantContext.requireTenantId()
    )
    const result = await documentFileService.getDownloadUrl(
      params.documentId,
      params.fileId,
      auth.user!.id
    )
    return response.ok(result)
  }

  async view({ params, auth, response }: HttpContext) {
    const document = await documentRepository.findByIdOrFail(params.documentId, auth.user!.id)
    await DocumentConfidentialityPolicy.assertCanView(
      document,
      auth.user!,
      tenantContext.requireTenantId()
    )
    const result = await documentFileService.getViewUrl(
      params.documentId,
      params.fileId,
      auth.user!.id
    )
    return response.ok(result)
  }

  async previewHtml({ params, auth, response }: HttpContext) {
    const document = await documentRepository.findByIdOrFail(params.documentId, auth.user!.id)
    await DocumentConfidentialityPolicy.assertCanView(
      document,
      auth.user!,
      tenantContext.requireTenantId()
    )
    const result = await documentFileEditService.getHtmlPreview(
      params.documentId,
      params.fileId,
      auth.user!.id
    )
    return response.ok(result)
  }

  async replace({ params, request, auth, response }: HttpContext) {
    const uploadFile = request.file('file', {
      size: `${env.get('FILE_MAX_SIZE_MB') ?? 25}mb`,
    })

    if (!uploadFile) {
      return response.badRequest({ error: 'File is required' })
    }

    const payload = await request.validateUsing(replaceFileValidator, {
      data: request.all(),
    })

    const { version, file } = await documentFileService.replace(
      params.documentId,
      params.fileId,
      uploadFile,
      auth.user!.id,
      payload.changeNotes
    )

    return response.created({
      version: {
        id: version.id,
        versionNumber: version.versionNumber,
        versionMinor: version.versionMinor ?? 0,
        label: formatVersionLabel(version.versionNumber, version.versionMinor ?? 0),
        changeNotes: version.changeNotes,
        createdAt: version.createdAt,
      },
      file: {
        id: file.id,
        versionId: file.versionId,
        originalName: file.originalName,
        mimeType: file.mimeType,
        fileSize: file.fileSize,
        checksum: file.checksum,
        createdAt: file.createdAt,
      },
    })
  }

  async destroy({ params, auth, response }: HttpContext) {
    await documentFileService.delete(params.documentId, params.fileId, auth.user!.id)
    return response.ok({ message: 'File deleted successfully' })
  }

  async edit({ params, auth, response }: HttpContext) {
    const payload = await documentFileEditService.getEditPayload(
      params.documentId,
      params.fileId,
      auth.user!.id
    )
    return response.ok(payload)
  }

  async saveEdit({ params, request, auth, response }: HttpContext) {
    const body = await request.validateUsing(saveFileEditValidator)
    const result = await documentFileEditService.saveEdit(
      params.documentId,
      params.fileId,
      auth.user!.id,
      body
    )

    return response.ok({
      metadataOnly: result.metadataOnly,
      version: result.version
        ? {
            id: result.version.id,
            versionNumber: result.version.versionNumber,
            versionMinor: result.version.versionMinor ?? 0,
            label: formatVersionLabel(result.version.versionNumber, result.version.versionMinor ?? 0),
            changeNotes: result.version.changeNotes,
            createdAt: result.version.createdAt,
          }
        : null,
      file: {
        id: result.file.id,
        versionId: result.file.versionId,
        originalName: result.file.originalName,
        mimeType: result.file.mimeType,
        fileSize: result.file.fileSize,
        createdAt: result.file.createdAt,
      },
    })
  }
}
