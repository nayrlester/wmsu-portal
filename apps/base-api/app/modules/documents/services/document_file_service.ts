import { createHash, randomUUID } from 'node:crypto'
import type { MultipartFile } from '@adonisjs/core/bodyparser'
import { DateTime } from 'luxon'
import env from '#start/env'
import {
  ALLOWED_EXTENSIONS,
  DEFAULT_MAX_FILE_SIZE_BYTES,
  DEFAULT_SIGNED_URL_EXPIRES_SECONDS,
  isExtensionAllowedForMime,
  resolveMimeType,
  resolveUploadExtension,
  type AllowedMimeType,
} from '#modules/documents/domain/files/file_constants'
import {
  FileTooLargeException,
  FileUploadNotAllowedException,
  InvalidFileTypeException,
  VirusDetectedException,
} from '#modules/documents/domain/files/file_exceptions'
import { DocumentPolicy } from '#modules/documents/domain/documents/document_policy'
import { DocumentVersionPolicy } from '#modules/documents/domain/documents/document_version_policy'
import { InvalidDocumentStateException } from '#modules/documents/domain/documents/document_exceptions'
import { DocumentAccessPolicy } from '#modules/documents/domain/documents/document_access_policy'
import { documentRepository } from '#infrastructure/repositories/document_repository'
import { documentFileRepository } from '#infrastructure/repositories/document_file_repository'
import { documentVersionRepository } from '#infrastructure/repositories/document_version_repository'
import { workflowInstanceRepository } from '#infrastructure/repositories/workflow_instance_repository'
import { getStorageAdapter } from '#infrastructure/storage/storage_factory'
import { planLimitService } from '#modules/documents/services/plan_limit_service'
import { documentIntelligenceService } from '#modules/documents/services/document_intelligence_service'
import { enqueueFileProcessing } from '#modules/documents/services/file_processing_enqueue_service'
import { auditService } from '#modules/documents/services/audit_service'
import { routingService } from '#modules/documents/services/routing_service'
import { defaultWorkflowService } from '#modules/documents/services/default_workflow_service'
import { workflowEngineService } from '#modules/documents/services/workflow_engine_service'
import { slaService } from '#modules/documents/services/sla_service'
import { tenantContext } from '#modules/documents/domain/tenant_context'
import { AuditAction, DocumentSourceType, DocumentStatus } from '#modules/documents/domain/enums/index'
import { DocumentConfidentialityPolicy } from '#modules/documents/domain/documents/document_confidentiality_policy'
import { watermarkPdf } from '#modules/documents/domain/records/scan_pdf'
import { formatVersionLabel } from '#modules/documents/domain/documents/document_version_label'
import { DocumentNotificationAction } from '#modules/documents/domain/notifications/document_notification_actions'
import { platformDocumentsService } from '#modules/documents/services/platform_documents_service'
import AuditLog from '#modules/documents/models/audit_log'
import type DocumentFile from '#modules/documents/models/document_file'
import type DocumentVersion from '#modules/documents/models/document_version'

export class DocumentVersionService {
  async list(documentId: string, viewerUserId: string, page = 1, limit = 25) {
    const document = await documentRepository.findByIdOrFail(documentId, viewerUserId)
    const visibility = { viewerUserId, documentCreatedById: document.createdById }
    const paginator = await documentVersionRepository.listByDocument(
      documentId,
      page,
      limit,
      visibility
    )
    const files = await documentFileRepository.listByDocument(documentId)
    const visibleVersionIds = new Set(paginator.all().map((version) => version.id))

    const versions = paginator.all().map((version) => ({
      id: version.id,
      versionNumber: version.versionNumber,
      versionMinor: version.versionMinor ?? 0,
      label: formatVersionLabel(version.versionNumber, version.versionMinor ?? 0),
      changeNotes: version.changeNotes,
      contentHtml: version.contentHtml,
      sourceType: version.sourceType,
      status: version.status,
      submittedAt: version.submittedAt,
      createdAt: version.createdAt,
      createdBy: version.createdBy
        ? {
            id: version.createdBy.id,
            fullName: version.createdBy.fullName,
          }
        : null,
      files: files
        .filter((file) => file.versionId === version.id && visibleVersionIds.has(version.id))
        .map((file) => this.serializeFile(file)),
    }))

    return { versions, meta: paginator.getMeta() }
  }

  async create(documentId: string, userId: string, changeNotes?: string): Promise<DocumentVersion> {
    const document = await documentRepository.findByIdOrFail(documentId, userId)
    DocumentPolicy.assertCanCreateVersion(document.status)

    const tenantId = tenantContext.requireTenantId()
    const nextVersion = await documentVersionRepository.getNextMajorVersion(documentId)

    const version = await documentVersionRepository.create({
      tenantId,
      documentId,
      versionNumber: nextVersion.major,
      versionMinor: nextVersion.minor,
      changeNotes: changeNotes ?? `Version ${formatVersionLabel(nextVersion.major, nextVersion.minor)}`,
      createdById: userId,
      contentHtml: null,
      sourceType: DocumentSourceType.UPLOAD,
      status: DocumentStatus.DRAFT,
    })

    await auditService.log({
      tenantId,
      userId,
      action: AuditAction.CREATE,
      entityType: 'document_version',
      entityId: version.id,
      newValues: {
        documentId,
        versionNumber: nextVersion.major,
        versionMinor: nextVersion.minor,
        versionLabel: formatVersionLabel(nextVersion.major, nextVersion.minor),
        changeNotes: version.changeNotes,
      },
    })

    return version
  }

  async submit(documentId: string, versionId: string, userId: string) {
    const document = await documentRepository.findByIdOrFail(documentId, userId)
    const version = await documentVersionRepository.findById(documentId, versionId)
    if (!version) {
      throw new FileUploadNotAllowedException('Document version not found')
    }

    DocumentVersionPolicy.assertCanSubmit(version.status)

    const activeWorkflow = await workflowInstanceRepository.findActiveByVersion(documentId, versionId)
    if (activeWorkflow) {
      throw new InvalidDocumentStateException('This version is already awaiting approval')
    }

    const tenantId = tenantContext.requireTenantId()
    version.status = DocumentStatus.SUBMITTED
    version.submittedAt = DateTime.now()
    await version.save()

    document.status = DocumentStatus.SUBMITTED
    document.submittedAt = DateTime.now()
    await documentRepository.save(document)

    await routingService.record({
      tenantId,
      documentId: document.id,
      action: DocumentNotificationAction.SUBMIT,
      fromUserId: userId,
      remarks: `Submitted ${formatVersionLabel(version.versionNumber, version.versionMinor ?? 0)} for processing`,
    })

    await auditService.log({
      tenantId,
      userId,
      action: AuditAction.UPDATE,
      entityType: 'document_version',
      entityId: version.id,
      metadata: { action: 'submit', documentId, versionId: version.id },
    })

    await defaultWorkflowService.ensureWorkflowReady(document.tenantId, userId)
    await workflowEngineService.startForDocument(document, null, version.id)
    await slaService.initializeForDocument(document)

    return {
      document: await documentRepository.findByIdOrFail(document.id, userId),
      version,
    }
  }

  private serializeFile(file: DocumentFile) {
    return {
      id: file.id,
      fileName: file.fileName,
      originalName: file.originalName,
      mimeType: file.mimeType,
      fileSize: file.fileSize,
      virusScanned: file.virusScanned,
      virusClean: file.virusClean,
      extractedMetadata: file.extractedMetadata,
      createdAt: file.createdAt,
    }
  }
}

export class DocumentFileService {
  private maxFileSizeBytes = Number(env.get('FILE_MAX_SIZE_MB') ?? 25) * 1024 * 1024 || DEFAULT_MAX_FILE_SIZE_BYTES
  private signedUrlExpires = Number(env.get('S3_SIGNED_URL_EXPIRES_SECONDS') ?? DEFAULT_SIGNED_URL_EXPIRES_SECONDS)

  async upload(
    documentId: string,
    versionId: string,
    uploadFile: MultipartFile,
    userId: string,
    metadata?: Record<string, unknown>
  ): Promise<DocumentFile> {
    const { document, version } = await this.assertCanAccessVersion(documentId, versionId, userId)
    this.assertCanUploadToVersion(document, version)

    const resolvedMime = this.validateUpload(uploadFile)

    const tenantId = tenantContext.requireTenantId()
    const fileBuffer = await this.readFileBuffer(uploadFile)

    await planLimitService.assertCanUploadBytes(tenantId, fileBuffer.byteLength)

    const storageKey = this.buildStorageKey(
      tenantId,
      documentId,
      version.versionNumber,
      version.versionMinor ?? 0,
      uploadFile.clientName
    )
    const checksum = createHash('sha256').update(fileBuffer).digest('hex')
    const storage = getStorageAdapter()

    await storage.upload({
      key: storageKey,
      body: fileBuffer,
      contentType: resolvedMime,
      metadata: {
        tenantId,
        documentId,
        versionId,
        uploadedBy: userId,
        checksum,
      },
    })

    const record = await documentFileRepository.create({
      tenantId,
      documentId,
      versionId,
      fileName: storageKey.split('/').pop()!,
      originalName: uploadFile.clientName,
      mimeType: resolvedMime,
      fileSize: fileBuffer.byteLength,
      s3Key: storageKey,
      s3Bucket: storage.bucket,
      checksum,
      virusScanned: false,
      virusClean: null,
      extractedMetadata: metadata ?? null,
    })

    await auditService.log({
      tenantId,
      userId,
      action: AuditAction.UPLOAD,
      entityType: 'document_file',
      entityId: record.id,
      newValues: {
        documentId,
        versionId,
        versionNumber: version.versionNumber,
        originalName: record.originalName,
        mimeType: record.mimeType,
        fileSize: record.fileSize,
      },
      metadata: { checksum, documentId, processing: 'queued' },
    })

    await enqueueFileProcessing({ tenantId, documentId, fileId: record.id })
    await this.maybeEnqueueIntelligence(tenantId, documentId, record.id, record.mimeType)
    await this.reconcileFilePrimaryContent(documentId, versionId)
    await this.recordEditNotification(tenantId, documentId, userId, `Uploaded "${record.originalName}"`)

    await platformDocumentsService.dualWriteUpload({
      userId,
      documentId,
      fileName: uploadFile.clientName,
      contentType: resolvedMime,
      body: fileBuffer,
    })

    return documentFileRepository.findByIdOrFail(documentId, record.id)
  }

  private async recordEditNotification(
    tenantId: string,
    documentId: string,
    userId: string,
    remarks: string
  ): Promise<void> {
    await routingService.record({
      tenantId,
      documentId,
      action: DocumentNotificationAction.EDIT,
      fromUserId: userId,
      remarks,
    })
  }

  private async hasUserSavedWrittenContent(documentId: string): Promise<boolean> {
    const logs = await AuditLog.query()
      .where('entity_type', 'document')
      .where('entity_id', documentId)
      .orderBy('created_at', 'desc')
      .limit(50)

    return logs.some((log) => log.metadata?.action === 'content_save')
  }

  private async reconcileFilePrimaryContent(documentId: string, versionId: string): Promise<void> {
    if (await this.hasUserSavedWrittenContent(documentId)) {
      return
    }

    const document = await documentRepository.findByIdOrFail(documentId)
    document.contentHtml = null
    document.sourceType = DocumentSourceType.UPLOAD
    await documentRepository.save(document)

    const version = await documentVersionRepository.findById(documentId, versionId)
    if (!version) {
      return
    }

    version.contentHtml = null
    version.sourceType = DocumentSourceType.UPLOAD
    await version.save()
  }

  private async maybeEnqueueIntelligence(
    tenantId: string,
    documentId: string,
    fileId: string,
    mimeType: string
  ) {
    if (!this.isIntelligenceMimeSupported(mimeType)) {
      return
    }

    try {
      const limits = await planLimitService.getLimits(tenantId)
      if (!planLimitService.hasFeature(limits, 'ocr') && !planLimitService.hasFeature(limits, 'ai')) {
        return
      }

      await documentIntelligenceService.enqueueAnalysis({ tenantId, documentId, fileId })
    } catch {
      // Intelligence is best-effort and must not block uploads
    }
  }

  private isIntelligenceMimeSupported(mimeType: string): boolean {
    return ['application/pdf', 'image/png', 'image/jpeg'].includes(mimeType)
  }

  async replace(
    documentId: string,
    fileId: string,
    uploadFile: MultipartFile,
    userId: string,
    changeNotes?: string
  ): Promise<{ version: DocumentVersion; file: DocumentFile }> {
    const document = await documentRepository.findByIdOrFail(documentId, userId)
    const existingFile = await documentFileRepository.findByIdOrFail(documentId, fileId)

    const tenantId = tenantContext.requireTenantId()
    const sourceVersion = await documentVersionRepository.findById(documentId, existingFile.versionId)
    if (!sourceVersion) {
      throw new FileUploadNotAllowedException('Document version not found')
    }
    DocumentAccessPolicy.assertCanViewVersion(sourceVersion, document, userId)
    this.assertCanBranchFromVersion(document, sourceVersion)
    const previousLabel = formatVersionLabel(
      sourceVersion.versionNumber,
      sourceVersion.versionMinor ?? 0
    )
    const nextVersion = await documentVersionRepository.getNextRevisionVersion(documentId, sourceVersion)
    const nextLabel = formatVersionLabel(nextVersion.major, nextVersion.minor)
    const notes =
      changeNotes?.trim() ||
      `Replaced "${existingFile.originalName}" (${previousLabel} → ${nextLabel})`

    const version = await documentVersionRepository.create({
      tenantId,
      documentId,
      versionNumber: nextVersion.major,
      versionMinor: nextVersion.minor,
      changeNotes: notes,
      createdById: userId,
      contentHtml: null,
      sourceType: DocumentSourceType.UPLOAD,
      status: DocumentStatus.DRAFT,
    })

    await auditService.log({
      tenantId,
      userId,
      action: AuditAction.CREATE,
      entityType: 'document_version',
      entityId: version.id,
      newValues: {
        documentId,
        versionNumber: nextVersion.major,
        versionMinor: nextVersion.minor,
        versionLabel: nextLabel,
        changeNotes: notes,
        replacedFileId: existingFile.id,
        replacedFileName: existingFile.originalName,
        sourceVersionId: sourceVersion.id,
        sourceVersionLabel: previousLabel,
      },
      metadata: { reason: 'file_replace', documentId },
    })

    const file = await this.upload(documentId, version.id, uploadFile, userId, {
      replacedFromFileId: existingFile.id,
      replacedFromFileName: existingFile.originalName,
      replacedFromVersionId: existingFile.versionId,
    })

    await auditService.log({
      tenantId,
      userId,
      action: AuditAction.UPDATE,
      entityType: 'document_file',
      entityId: existingFile.id,
      oldValues: {
        originalName: existingFile.originalName,
        versionId: existingFile.versionId,
      },
      newValues: {
        documentId,
        replacedByFileId: file.id,
        replacedByVersionId: version.id,
        replacedByVersionNumber: nextVersion.major,
        replacedByVersionMinor: nextVersion.minor,
        replacedByVersionLabel: nextLabel,
      },
      metadata: { reason: 'file_replaced', documentId },
    })

    await this.recordEditNotification(tenantId, documentId, userId, notes)

    return { version, file }
  }

  async replaceFromBuffer(
    documentId: string,
    fileId: string,
    buffer: Buffer,
    originalName: string,
    mimeType: AllowedMimeType,
    userId: string,
    changeNotes?: string
  ): Promise<{ version: DocumentVersion; file: DocumentFile }> {
    const document = await documentRepository.findByIdOrFail(documentId, userId)
    const existingFile = await documentFileRepository.findByIdOrFail(documentId, fileId)

    const tenantId = tenantContext.requireTenantId()
    const sourceVersion = await documentVersionRepository.findById(documentId, existingFile.versionId)
    if (!sourceVersion) {
      throw new FileUploadNotAllowedException('Document version not found')
    }
    DocumentAccessPolicy.assertCanViewVersion(sourceVersion, document, userId)
    this.assertCanBranchFromVersion(document, sourceVersion)
    const previousLabel = formatVersionLabel(
      sourceVersion.versionNumber,
      sourceVersion.versionMinor ?? 0
    )
    const nextVersion = await documentVersionRepository.getNextRevisionVersion(documentId, sourceVersion)
    const nextLabel = formatVersionLabel(nextVersion.major, nextVersion.minor)
    const notes =
      changeNotes?.trim() ||
      `Edited "${existingFile.originalName}" (${previousLabel} → ${nextLabel})`

    const version = await documentVersionRepository.create({
      tenantId,
      documentId,
      versionNumber: nextVersion.major,
      versionMinor: nextVersion.minor,
      changeNotes: notes,
      createdById: userId,
      contentHtml: null,
      sourceType: DocumentSourceType.UPLOAD,
      status: DocumentStatus.DRAFT,
    })

    await auditService.log({
      tenantId,
      userId,
      action: AuditAction.CREATE,
      entityType: 'document_version',
      entityId: version.id,
      newValues: {
        documentId,
        versionNumber: nextVersion.major,
        versionMinor: nextVersion.minor,
        versionLabel: nextLabel,
        changeNotes: notes,
        editedFileId: existingFile.id,
        editedFileName: existingFile.originalName,
        sourceVersionId: sourceVersion.id,
        sourceVersionLabel: previousLabel,
      },
      metadata: { reason: 'file_edit', documentId },
    })

    const file = await this.uploadFromBuffer(
      documentId,
      version.id,
      buffer,
      originalName,
      mimeType,
      userId,
      {
        editedFromFileId: existingFile.id,
        editedFromFileName: existingFile.originalName,
        editedFromVersionId: existingFile.versionId,
      }
    )

    await this.recordEditNotification(tenantId, documentId, userId, notes)

    return { version, file }
  }

  async uploadFromBuffer(
    documentId: string,
    versionId: string,
    buffer: Buffer,
    originalName: string,
    mimeType: AllowedMimeType,
    userId: string,
    metadata?: Record<string, unknown>
  ): Promise<DocumentFile> {
    const { document, version } = await this.assertCanAccessVersion(documentId, versionId, userId)
    this.assertCanUploadToVersion(document, version)

    const tenantId = tenantContext.requireTenantId()
    await planLimitService.assertCanUploadBytes(tenantId, buffer.byteLength)

    const storageKey = this.buildStorageKey(
      tenantId,
      documentId,
      version.versionNumber,
      version.versionMinor ?? 0,
      originalName
    )
    const checksum = createHash('sha256').update(buffer).digest('hex')
    const storage = getStorageAdapter()

    await storage.upload({
      key: storageKey,
      body: buffer,
      contentType: mimeType,
      metadata: {
        tenantId,
        documentId,
        versionId,
        uploadedBy: userId,
        checksum,
      },
    })

    const record = await documentFileRepository.create({
      tenantId,
      documentId,
      versionId,
      fileName: storageKey.split('/').pop()!,
      originalName,
      mimeType,
      fileSize: buffer.byteLength,
      s3Key: storageKey,
      s3Bucket: storage.bucket,
      checksum,
      virusScanned: false,
      virusClean: null,
      extractedMetadata: metadata ?? null,
    })

    await auditService.log({
      tenantId,
      userId,
      action: AuditAction.UPLOAD,
      entityType: 'document_file',
      entityId: record.id,
      newValues: {
        documentId,
        versionId,
        versionNumber: version.versionNumber,
        originalName: record.originalName,
        mimeType: record.mimeType,
        fileSize: record.fileSize,
      },
      metadata: { checksum, documentId, source: 'buffer_upload', processing: 'queued' },
    })

    await enqueueFileProcessing({ tenantId, documentId, fileId: record.id })
    await this.maybeEnqueueIntelligence(tenantId, documentId, record.id, record.mimeType)
    await this.reconcileFilePrimaryContent(documentId, versionId)

    await platformDocumentsService.dualWriteUpload({
      userId,
      documentId,
      fileName: originalName,
      contentType: mimeType,
      body: buffer,
    })

    return documentFileRepository.findByIdOrFail(documentId, record.id)
  }

  async getDownloadUrl(
    documentId: string,
    fileId: string,
    userId: string
  ): Promise<{ url: string; expiresIn: number; watermarked?: boolean }> {
    const document = await documentRepository.findByIdOrFail(documentId, userId)
    const file = await documentFileRepository.findByIdOrFail(documentId, fileId)
    await this.assertCanAccessFileVersion(document, documentId, file.versionId, userId)

    if (file.virusScanned && file.virusClean === false) {
      throw new VirusDetectedException('File is quarantined')
    }

    const storage = getStorageAdapter()
    let downloadKey = file.s3Key
    let watermarked = false

    if (
      DocumentConfidentialityPolicy.isSensitive(document.confidentiality) &&
      file.mimeType === 'application/pdf'
    ) {
      const original = await storage.read(file.s3Key)
      const label = `${String(document.confidentiality).toUpperCase()} · ${document.trackingNumber ?? document.id}`
      const stamped = await watermarkPdf(original, label)
      downloadKey = `watermarked/${file.tenantId}/${file.id}/${Date.now()}.pdf`
      await storage.upload({
        key: downloadKey,
        body: stamped,
        contentType: 'application/pdf',
        metadata: {
          tenantId: file.tenantId,
          documentId,
          sourceFileId: file.id,
          watermarked: 'true',
        },
      })
      watermarked = true
    }

    const url = await storage.getSignedDownloadUrl(
      downloadKey,
      this.signedUrlExpires,
      file.originalName
    )

    if (userId) {
      await auditService.log({
        tenantId: file.tenantId,
        userId,
        action: AuditAction.DOWNLOAD,
        entityType: 'document_file',
        entityId: file.id,
        newValues: {
          documentId,
          originalName: file.originalName,
          mimeType: file.mimeType,
          watermarked,
        },
        metadata: { documentId, watermarked },
      })
    }

    return { url, expiresIn: this.signedUrlExpires, watermarked }
  }

  async getViewUrl(
    documentId: string,
    fileId: string,
    userId: string
  ): Promise<{ url: string; expiresIn: number; watermarked?: boolean }> {
    const document = await documentRepository.findByIdOrFail(documentId, userId)
    const file = await documentFileRepository.findByIdOrFail(documentId, fileId)
    await this.assertCanAccessFileVersion(document, documentId, file.versionId, userId)

    if (file.virusScanned && file.virusClean === false) {
      throw new VirusDetectedException('File is quarantined')
    }

    const storage = getStorageAdapter()
    let viewKey = file.s3Key
    let watermarked = false

    if (
      DocumentConfidentialityPolicy.isSensitive(document.confidentiality) &&
      file.mimeType === 'application/pdf'
    ) {
      const original = await storage.read(file.s3Key)
      const label = `${String(document.confidentiality).toUpperCase()} · ${document.trackingNumber ?? document.id}`
      const stamped = await watermarkPdf(original, label)
      viewKey = `watermarked/${file.tenantId}/${file.id}/view-${Date.now()}.pdf`
      await storage.upload({
        key: viewKey,
        body: stamped,
        contentType: 'application/pdf',
        metadata: {
          tenantId: file.tenantId,
          documentId,
          sourceFileId: file.id,
          watermarked: 'true',
        },
      })
      watermarked = true
    }

    const url = await storage.getSignedDownloadUrl(
      viewKey,
      this.signedUrlExpires,
      file.originalName,
      'inline'
    )

    if (userId) {
      await auditService.log({
        tenantId: file.tenantId,
        userId,
        action: AuditAction.VIEW,
        entityType: 'document_file',
        entityId: file.id,
        newValues: {
          documentId,
          originalName: file.originalName,
          mimeType: file.mimeType,
          watermarked,
        },
        metadata: { documentId, watermarked },
      })
    }

    return { url, expiresIn: this.signedUrlExpires, watermarked }
  }

  async delete(documentId: string, fileId: string, userId: string): Promise<void> {
    const document = await documentRepository.findByIdOrFail(documentId, userId)
    const file = await documentFileRepository.findByIdOrFail(documentId, fileId)
    const { version } = await this.assertCanAccessVersion(documentId, file.versionId, userId)
    this.assertCanUploadToVersion(document, version)

    await documentFileRepository.softDelete(file)

    await auditService.log({
      tenantId: file.tenantId,
      userId,
      action: AuditAction.DELETE,
      entityType: 'document_file',
      entityId: file.id,
      oldValues: {
        documentId,
        originalName: file.originalName,
        s3Key: file.s3Key,
        versionId: file.versionId,
      },
      metadata: { documentId },
    })
  }

  async list(documentId: string, viewerUserId: string, versionId?: string) {
    const document = await documentRepository.findByIdOrFail(documentId, viewerUserId)
    const visibility = { viewerUserId, documentCreatedById: document.createdById }
    const allVersions = await documentVersionRepository.listAllByDocument(documentId, visibility)
    const versionById = new Map(allVersions.map((version) => [version.id, version]))

    if (versionId) {
      const version = versionById.get(versionId)
      if (!version) {
        throw new FileUploadNotAllowedException('Document version not found')
      }
      DocumentAccessPolicy.assertCanViewVersion(version, document, viewerUserId)
    }

    const files = await documentFileRepository.listByDocument(documentId, versionId)
    const visibleFiles = files.filter((file) => versionById.has(file.versionId))

    return visibleFiles.map((file) => ({
      id: file.id,
      versionId: file.versionId,
      fileName: file.fileName,
      originalName: file.originalName,
      mimeType: file.mimeType,
      fileSize: file.fileSize,
      checksum: file.checksum,
      virusScanned: file.virusScanned,
      virusClean: file.virusClean,
      extractedMetadata: file.extractedMetadata,
      createdAt: file.createdAt,
    }))
  }

  validateUpload(uploadFile: MultipartFile): AllowedMimeType {
    if (!uploadFile.isValid) {
      throw new InvalidFileTypeException(
        uploadFile.errors.map((error) => error.message).join(', ') || 'Invalid upload'
      )
    }

    // Prefer client filename: Adonis magic-byte sniff often reports OOXML as "zip".
    const extension = resolveUploadExtension({
      clientName: uploadFile.clientName,
      magicExtname: uploadFile.extname,
    })
    const declaredMime = uploadFile.subtype
      ? `${uploadFile.type}/${uploadFile.subtype}`
      : (uploadFile.type ?? undefined)
    const resolvedMime = resolveMimeType(declaredMime, extension)

    if (!resolvedMime) {
      throw new InvalidFileTypeException(
        `Unsupported file type. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`
      )
    }

    if (!isExtensionAllowedForMime(resolvedMime, extension)) {
      throw new InvalidFileTypeException('File extension does not match MIME type')
    }

    if ((uploadFile.size ?? 0) > this.maxFileSizeBytes) {
      throw new FileTooLargeException(`Maximum file size is ${this.maxFileSizeBytes / (1024 * 1024)}MB`)
    }

    return resolvedMime
  }

  private async readFileBuffer(uploadFile: MultipartFile): Promise<Buffer> {
    if (!uploadFile.tmpPath) {
      throw new InvalidFileTypeException('Uploaded file is missing')
    }

    const { readFile } = await import('node:fs/promises')
    return readFile(uploadFile.tmpPath)
  }

  private buildStorageKey(
    tenantId: string,
    documentId: string,
    versionNumber: number,
    versionMinor: number,
    originalName: string
  ): string {
    const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 200)
    const versionSegment = formatVersionLabel(versionNumber, versionMinor).replace('.', '_')
    return `tenants/${tenantId}/documents/${documentId}/${versionSegment}/${randomUUID()}-${safeName}`
  }

  async createPresignedUpload(
    documentId: string,
    versionId: string,
    userId: string,
    input: { fileName: string; mimeType: string; fileSize: number }
  ) {
    const { document, version } = await this.assertCanAccessVersion(documentId, versionId, userId)
    this.assertCanUploadToVersion(document, version)

    const resolvedMime = this.validateMime(input.mimeType, input.fileName)
    const tenantId = tenantContext.requireTenantId()
    await planLimitService.assertCanUploadBytes(tenantId, input.fileSize)

    const storageKey = this.buildStorageKey(
      tenantId,
      documentId,
      version.versionNumber,
      version.versionMinor ?? 0,
      input.fileName
    )

    const storage = getStorageAdapter()
    if (!('getPresignedUploadUrl' in storage)) {
      throw new FileUploadNotAllowedException('Direct uploads require S3/R2 object storage')
    }

    const uploadUrl = await (
      storage as { getPresignedUploadUrl: (key: string, mime: string, ttl: number) => Promise<string> }
    ).getPresignedUploadUrl(storageKey, resolvedMime, this.signedUrlExpires)

    return {
      uploadUrl,
      storageKey,
      bucket: storage.bucket,
      expiresIn: this.signedUrlExpires,
      documentId,
      versionId,
      userId,
      mimeType: resolvedMime,
      fileName: input.fileName,
    }
  }

  async completePresignedUpload(
    documentId: string,
    versionId: string,
    userId: string,
    input: {
      storageKey: string
      originalName: string
      mimeType: string
      fileSize: number
      checksum?: string
    }
  ) {
    await this.assertCanAccessVersion(documentId, versionId, userId)

    const storage = getStorageAdapter()
    const exists = await storage.exists(input.storageKey)
    if (!exists) {
      throw new FileUploadNotAllowedException('Uploaded object not found in storage')
    }

    const tenantId = tenantContext.requireTenantId()
    const record = await documentFileRepository.create({
      tenantId,
      documentId,
      versionId,
      fileName: input.storageKey.split('/').pop()!,
      originalName: input.originalName,
      mimeType: input.mimeType,
      fileSize: input.fileSize,
      s3Key: input.storageKey,
      s3Bucket: storage.bucket,
      checksum: input.checksum ?? null,
      virusScanned: false,
      virusClean: null,
      extractedMetadata: null,
    })

    await enqueueFileProcessing({ tenantId, documentId, fileId: record.id })
    await this.maybeEnqueueIntelligence(tenantId, documentId, record.id, record.mimeType)
    await this.reconcileFilePrimaryContent(documentId, versionId)

    try {
      const body = await storage.read(input.storageKey)
      await platformDocumentsService.dualWriteUpload({
        userId,
        documentId,
        fileName: input.originalName,
        contentType: input.mimeType,
        body,
      })
    } catch {
      // dual-write best-effort; local file already recorded
    }

    return documentFileRepository.findByIdOrFail(documentId, record.id)
  }

  private validateMime(mimeType: string, fileName: string): AllowedMimeType {
    const extension = fileName.includes('.') ? fileName.split('.').pop()!.toLowerCase() : ''
    const resolvedMime = resolveMimeType(mimeType, extension)
    if (!resolvedMime) {
      throw new InvalidFileTypeException('Unsupported file type')
    }
    return resolvedMime
  }

  private assertCanUploadToVersion(
    document: { status: string },
    version: { status: string }
  ): void {
    DocumentPolicy.assertCanModifyVersionContent(document.status)
    DocumentVersionPolicy.assertCanEditInPlace(version.status)
  }

  private assertCanBranchFromVersion(
    document: { status: string },
    version: { status: string }
  ): void {
    DocumentPolicy.assertCanModifyVersionContent(document.status)
    DocumentVersionPolicy.assertCanBranchFrom(version.status)
  }

  private async assertCanAccessVersion(documentId: string, versionId: string, userId: string) {
    const document = await documentRepository.findByIdOrFail(documentId, userId)
    const version = await documentVersionRepository.findById(documentId, versionId)
    if (!version) {
      throw new FileUploadNotAllowedException('Document version not found')
    }
    DocumentAccessPolicy.assertCanViewVersion(version, document, userId)
    return { document, version }
  }

  private async assertCanAccessFileVersion(
    document: { status: string; createdById: string },
    documentId: string,
    versionId: string,
    userId: string
  ): Promise<void> {
    const version = await documentVersionRepository.findById(documentId, versionId)
    if (!version) {
      throw new FileUploadNotAllowedException('Document version not found')
    }
    DocumentAccessPolicy.assertCanViewVersion(version, document, userId)
  }
}

export const documentFileService = new DocumentFileService()
export const documentVersionService = new DocumentVersionService()
