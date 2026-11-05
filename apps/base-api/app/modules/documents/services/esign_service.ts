import { createHash, randomUUID } from 'node:crypto'
import { DateTime } from 'luxon'
import env from '#start/env'
import { Exception } from '@adonisjs/core/exceptions'
import { AuditAction, DocumentStatus, EsignEnvelopeStatus } from '#modules/documents/domain/enums/index'
import { formatVersionLabel, resolveNextMajorVersion, toVersionParts } from '#modules/documents/domain/documents/document_version_label'
import { tenantContext } from '#modules/documents/domain/tenant_context'
import DocumentFile from '#modules/documents/models/document_file'
import EsignEnvelope from '#modules/documents/models/esign_envelope'
import User from '#modules/documents/models/user'
import { documentRepository } from '#infrastructure/repositories/document_repository'
import { documentFileRepository } from '#infrastructure/repositories/document_file_repository'
import { documentVersionRepository } from '#infrastructure/repositories/document_version_repository'
import { getStorageAdapter } from '#infrastructure/storage/storage_factory'
import { pandadocClient, PandadocClientError } from '#infrastructure/pandadoc/pandadoc_client'
import { auditService } from '#modules/documents/services/audit_service'

export class EsignNotConfiguredException extends Exception {
  static status = 503
  static code = 'E_ESIGN_NOT_CONFIGURED'

  constructor(message = 'PandaDoc e-sign is not configured') {
    super(message, { status: 503, code: 'E_ESIGN_NOT_CONFIGURED' })
  }
}

export class EsignValidationException extends Exception {
  static status = 422
  static code = 'E_ESIGN_VALIDATION'

  constructor(message: string) {
    super(message, { status: 422, code: 'E_ESIGN_VALIDATION' })
  }
}

export type EsignRecipientInput = {
  email: string
  firstName?: string
  lastName?: string
  role?: string
}

export class EsignService {
  assertEnabled() {
    if (env.get('PANDADOC_ENABLED') === false || !pandadocClient.isConfigured()) {
      throw new EsignNotConfiguredException()
    }
  }

  async getLatestForDocument(documentId: string, userId: string) {
    await documentRepository.findByIdOrFail(documentId, userId)
    const tenantId = tenantContext.requireTenantId()
    return EsignEnvelope.query()
      .where('tenant_id', tenantId)
      .where('document_id', documentId)
      .orderBy('created_at', 'desc')
      .first()
  }

  /** Poll PandaDoc and finalize a completed envelope (covers local/dev without webhooks). */
  async syncFromProvider(documentId: string, userId: string) {
    this.assertEnabled()
    const envelope = await this.getLatestForDocument(documentId, userId)
    if (!envelope) {
      throw new EsignValidationException('No e-sign envelope found for this document')
    }

    if (envelope.status === EsignEnvelopeStatus.COMPLETED && envelope.signedFileId) {
      return { envelope, synced: false }
    }

    const remote = await pandadocClient.getDocument(envelope.pandadocDocumentId)
    const status = remote.status ?? ''
    if (status.includes('completed') || status === 'document.completed') {
      await this.completeEnvelope(envelope)
      await envelope.refresh()
      return { envelope, synced: true }
    }
    if (status.includes('viewed') || status === 'document.viewed') {
      if (envelope.status !== EsignEnvelopeStatus.VIEWED) {
        envelope.status = EsignEnvelopeStatus.VIEWED
        await envelope.save()
      }
    }
    return { envelope, synced: false }
  }

  async sendForSignature(
    documentId: string,
    userId: string,
    input: {
      fileId?: string
      recipients: EsignRecipientInput[]
      silent?: boolean
      subject?: string
      message?: string
      /** When true, open an embedded signing session for the acting user immediately. */
      openSession?: boolean
    }
  ) {
    this.assertEnabled()
    const document = await documentRepository.findByIdOrFail(documentId, userId)
    const tenantId = tenantContext.requireTenantId()
    const actor = await User.findOrFail(userId)

    const recipients =
      input.recipients.length > 0
        ? input.recipients
        : [
            {
              email: actor.email,
              firstName: actor.fullName?.split(' ')[0],
              lastName: actor.fullName?.split(' ').slice(1).join(' ') || undefined,
              role: 'Signer',
            },
          ]

    const files = await documentFileRepository.listByDocument(documentId)
    const file = input.fileId
      ? files.find((f) => f.id === input.fileId)
      : files[0]

    if (!file) {
      throw new EsignValidationException('Document has no file to sign. Upload a PDF first.')
    }

    const buffer = await this.readSourceFileForEsign(file)

    let created
    try {
      created = await pandadocClient.createDocumentFromFile({
        name: `${document.trackingNumber} — ${document.title}`.slice(0, 200),
        fileName: file.originalName,
        fileBuffer: buffer,
        mimeType: file.mimeType,
        recipients: recipients.map((r) => ({
          email: r.email,
          first_name: r.firstName,
          last_name: r.lastName,
          role: r.role ?? 'Signer',
        })),
        metadata: {
          tenantId,
          documentId: document.id,
          trackingNumber: document.trackingNumber,
        },
      })
    } catch (error) {
      const message = error instanceof PandadocClientError ? error.message : 'PandaDoc create failed'
      await auditService.log({
        tenantId,
        userId,
        action: AuditAction.ESIGN_FAILED,
        entityType: 'document',
        entityId: document.id,
        metadata: { error: message },
      })
      throw error
    }

    const envelope = await EsignEnvelope.create({
      tenantId,
      documentId: document.id,
      versionId: file.versionId,
      fileId: file.id,
      pandadocDocumentId: created.id,
      status: EsignEnvelopeStatus.UPLOADED,
      recipients: recipients.map((r) => ({
        email: r.email,
        ...(r.firstName ? { firstName: r.firstName } : {}),
        ...(r.lastName ? { lastName: r.lastName } : {}),
        role: r.role ?? 'Signer',
      })),
      createdById: userId,
    })

    try {
      await pandadocClient.waitUntilDraft(created.id)

      // Uploaded PDFs have no signature boxes — add one for the primary recipient so
      // embedded signing can actually be completed (otherwise the UI only "opens").
      const details = await pandadocClient.getDocumentDetails(created.id)
      const signerEmail = recipients[0]?.email?.toLowerCase()
      const signer =
        details.recipients?.find((r) => r.email?.toLowerCase() === signerEmail) ??
        details.recipients?.[0]
      if (signer?.id) {
        const page = details.version_info?.number_of_pages ?? 1
        await pandadocClient.createSignatureField(created.id, {
          recipientId: signer.id,
          page,
        })
      }

      // Always silent — DocTrack owns the signing UX; email is notification-only if ever enabled.
      await pandadocClient.sendDocument(created.id, {
        silent: input.silent ?? true,
        subject: input.subject ?? `Please sign: ${document.title}`,
        message: input.message ?? `Please review and sign document ${document.trackingNumber}.`,
      })
      envelope.status = EsignEnvelopeStatus.SENT
      envelope.sentAt = DateTime.now()
      await envelope.save()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'PandaDoc send failed'
      envelope.status = EsignEnvelopeStatus.ERROR
      envelope.errorMessage = message
      await envelope.save()
      await auditService.log({
        tenantId,
        userId,
        action: AuditAction.ESIGN_FAILED,
        entityType: 'esign_envelope',
        entityId: envelope.id,
        metadata: { error: message, pandadocDocumentId: created.id },
      })
      throw error
    }

    await auditService.log({
      tenantId,
      userId,
      action: AuditAction.ESIGN_SENT,
      entityType: 'esign_envelope',
      entityId: envelope.id,
      newValues: {
        documentId: document.id,
        trackingNumber: document.trackingNumber,
        pandadocDocumentId: created.id,
        recipients: envelope.recipients,
      },
    })

    let sessionId: string | null = null
    let expiresAt: string | null = null
    const openSession = input.openSession !== false
    const actorIsRecipient = envelope.recipients.some(
      (r) => r.email.toLowerCase() === actor.email.toLowerCase()
    )
    if (openSession && actorIsRecipient) {
      const session = await pandadocClient.createSession(created.id, actor.email)
      sessionId = session.id
      expiresAt = session.expires_at ?? null
    }

    return { envelope, sessionId, expiresAt }
  }

  /**
   * Embedded signing prepare: create draft + editing session so the user can place
   * signature fields (no auto-place, not sent yet).
   */
  async startEmbeddedSigning(documentId: string, userId: string, fileId?: string) {
    this.assertEnabled()
    const document = await documentRepository.findByIdOrFail(documentId, userId)
    const tenantId = tenantContext.requireTenantId()
    const actor = await User.findOrFail(userId)

    const recipients: EsignRecipientInput[] = [
      {
        email: actor.email,
        firstName: actor.fullName?.split(' ')[0],
        lastName: actor.fullName?.split(' ').slice(1).join(' ') || undefined,
        role: 'Signer',
      },
    ]

    const files = await documentFileRepository.listByDocument(documentId)
    const file = fileId ? files.find((f) => f.id === fileId) : files[0]
    if (!file) {
      throw new EsignValidationException('Document has no file to sign. Upload a PDF first.')
    }

    const buffer = await this.readSourceFileForEsign(file)

    let created
    try {
      created = await pandadocClient.createDocumentFromFile({
        name: `${document.trackingNumber} — ${document.title}`.slice(0, 200),
        fileName: file.originalName,
        fileBuffer: buffer,
        mimeType: file.mimeType,
        recipients: recipients.map((r) => ({
          email: r.email,
          first_name: r.firstName,
          last_name: r.lastName,
          role: r.role ?? 'Signer',
        })),
        metadata: {
          tenantId,
          documentId: document.id,
          trackingNumber: document.trackingNumber,
        },
      })
    } catch (error) {
      const message = error instanceof PandadocClientError ? error.message : 'PandaDoc create failed'
      await auditService.log({
        tenantId,
        userId,
        action: AuditAction.ESIGN_FAILED,
        entityType: 'document',
        entityId: document.id,
        metadata: { error: message },
      })
      throw error
    }

    const envelope = await EsignEnvelope.create({
      tenantId,
      documentId: document.id,
      versionId: file.versionId,
      fileId: file.id,
      pandadocDocumentId: created.id,
      status: EsignEnvelopeStatus.DRAFT,
      recipients: recipients.map((r) => ({
        email: r.email,
        ...(r.firstName ? { firstName: r.firstName } : {}),
        ...(r.lastName ? { lastName: r.lastName } : {}),
        role: r.role ?? 'Signer',
      })),
      createdById: userId,
    })

    try {
      await pandadocClient.waitUntilDraft(created.id)
      const editing = await this.createEditingSessionForEnvelope(envelope, actor.email)
      envelope.status = EsignEnvelopeStatus.UPLOADED
      await envelope.save()

      return {
        envelope,
        editorToken: editing.token,
        expiresAt: editing.expires_at ?? null,
        sessionId: null as string | null,
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'PandaDoc prepare failed'
      envelope.status = EsignEnvelopeStatus.ERROR
      envelope.errorMessage = message
      await envelope.save()
      await auditService.log({
        tenantId,
        userId,
        action: AuditAction.ESIGN_FAILED,
        entityType: 'esign_envelope',
        entityId: envelope.id,
        metadata: { error: message, pandadocDocumentId: created.id },
      })
      throw error
    }
  }

  /** Re-open place-fields editor for a draft/uploaded envelope that has not been sent. */
  async createPlacementSession(documentId: string, userId: string) {
    this.assertEnabled()
    const actor = await User.findOrFail(userId)
    const envelope = await this.getLatestForDocument(documentId, userId)
    if (!envelope) {
      throw new EsignValidationException('No e-sign envelope found for this document')
    }
    if (
      ![EsignEnvelopeStatus.DRAFT, EsignEnvelopeStatus.UPLOADED].includes(
        envelope.status as EsignEnvelopeStatus
      )
    ) {
      throw new EsignValidationException(
        `Envelope status "${envelope.status}" cannot open field placement`
      )
    }

    await pandadocClient.waitUntilDraft(envelope.pandadocDocumentId)
    const editing = await this.createEditingSessionForEnvelope(envelope, actor.email)
    return {
      envelope,
      editorToken: editing.token,
      expiresAt: editing.expires_at ?? null,
    }
  }

  /**
   * After the user places signature fields: silent-send + create signing session.
   */
  async finalizeEmbeddedSigning(documentId: string, userId: string) {
    this.assertEnabled()
    const document = await documentRepository.findByIdOrFail(documentId, userId)
    const tenantId = tenantContext.requireTenantId()
    const actor = await User.findOrFail(userId)
    const envelope = await this.getLatestForDocument(documentId, userId)
    if (!envelope) {
      throw new EsignValidationException('No e-sign envelope found for this document')
    }
    if (
      ![EsignEnvelopeStatus.DRAFT, EsignEnvelopeStatus.UPLOADED].includes(
        envelope.status as EsignEnvelopeStatus
      )
    ) {
      throw new EsignValidationException(
        `Envelope status "${envelope.status}" cannot be sent for signing`
      )
    }

    try {
      const fields = await pandadocClient.listFields(envelope.pandadocDocumentId)
      const hasSignature = (fields.fields ?? []).some((f) => {
        const type = String(f.type ?? '').toLowerCase()
        return type === 'signature' || type.includes('signature')
      })
      if (!hasSignature) {
        throw new EsignValidationException(
          'Place at least one signature field on the document before continuing.'
        )
      }

      await pandadocClient.sendDocument(envelope.pandadocDocumentId, {
        silent: true,
        subject: `Please sign: ${document.title}`,
        message: `Please review and sign document ${document.trackingNumber}.`,
      })
      envelope.status = EsignEnvelopeStatus.SENT
      envelope.sentAt = DateTime.now()
      envelope.errorMessage = null
      await envelope.save()
    } catch (error) {
      if (error instanceof EsignValidationException) throw error
      const message = error instanceof Error ? error.message : 'PandaDoc send failed'
      // Keep uploaded so the user can fix placement / retry finalize without starting over.
      envelope.errorMessage = message
      await envelope.save()
      await auditService.log({
        tenantId,
        userId,
        action: AuditAction.ESIGN_FAILED,
        entityType: 'esign_envelope',
        entityId: envelope.id,
        metadata: { error: message, pandadocDocumentId: envelope.pandadocDocumentId },
      })
      throw error
    }

    await auditService.log({
      tenantId,
      userId,
      action: AuditAction.ESIGN_SENT,
      entityType: 'esign_envelope',
      entityId: envelope.id,
      newValues: {
        documentId: document.id,
        trackingNumber: document.trackingNumber,
        pandadocDocumentId: envelope.pandadocDocumentId,
        recipients: envelope.recipients,
      },
    })

    const isRecipient = envelope.recipients.some(
      (r) => r.email.toLowerCase() === actor.email.toLowerCase()
    )
    if (!isRecipient) {
      return { envelope, sessionId: null as string | null, expiresAt: null as string | null }
    }

    const session = await pandadocClient.createSession(envelope.pandadocDocumentId, actor.email)
    return {
      envelope,
      sessionId: session.id,
      expiresAt: session.expires_at ?? null,
    }
  }

  private editorEmailFor(actorEmail: string): string {
    const configured = env.get('PANDADOC_EDITOR_EMAIL')?.trim()
    return configured || actorEmail
  }

  private async createEditingSessionForEnvelope(envelope: EsignEnvelope, actorEmail: string) {
    return pandadocClient.createEditingSession(
      envelope.pandadocDocumentId,
      this.editorEmailFor(actorEmail),
      3_600
    )
  }

  async createSigningSession(documentId: string, userId: string) {
    this.assertEnabled()
    const user = await User.findOrFail(userId)
    const envelope = await this.getLatestForDocument(documentId, userId)
    if (!envelope) {
      throw new EsignValidationException('No e-sign envelope found for this document')
    }
    if (
      ![EsignEnvelopeStatus.SENT, EsignEnvelopeStatus.VIEWED].includes(
        envelope.status as EsignEnvelopeStatus
      )
    ) {
      throw new EsignValidationException(`Envelope status "${envelope.status}" cannot open a signing session`)
    }

    const email = user.email
    const isRecipient = envelope.recipients.some(
      (r) => r.email.toLowerCase() === email.toLowerCase()
    )
    if (!isRecipient) {
      throw new EsignValidationException('Current user is not a recipient on this envelope')
    }

    const session = await pandadocClient.createSession(envelope.pandadocDocumentId, email)
    return { envelope, sessionId: session.id, expiresAt: session.expires_at ?? null }
  }

  async handleWebhook(payload: {
    event?: string
    data?: { id?: string; status?: string; [key: string]: unknown }
  }) {
    const pandadocId = payload.data?.id
    if (!pandadocId) {
      return { ignored: true, reason: 'missing document id' }
    }

    const envelope = await EsignEnvelope.query().where('pandadoc_document_id', pandadocId).first()
    if (!envelope) {
      return { ignored: true, reason: 'unknown envelope' }
    }

    return tenantContext.run({ tenantId: envelope.tenantId }, async () => {
      const status = payload.data?.status ?? payload.event ?? ''
      if (status.includes('completed') || status === 'document.completed') {
        return this.completeEnvelope(envelope)
      }
      if (status.includes('declined') || status === 'document.declined') {
        envelope.status = EsignEnvelopeStatus.DECLINED
        await envelope.save()
        return { ok: true, status: envelope.status }
      }
      if (status.includes('viewed') || status === 'document.viewed') {
        envelope.status = EsignEnvelopeStatus.VIEWED
        await envelope.save()
        return { ok: true, status: envelope.status }
      }
      return { ignored: true, reason: `unhandled status ${status}` }
    })
  }

  private async completeEnvelope(envelope: EsignEnvelope) {
    if (envelope.status === EsignEnvelopeStatus.COMPLETED && envelope.signedFileId) {
      return { ok: true, status: envelope.status, alreadyCompleted: true }
    }

    const pdf = await pandadocClient.downloadCompletedPdf(envelope.pandadocDocumentId)
    const document = await documentRepository.findByIdOrFail(envelope.documentId)
    const latest = await documentVersionRepository.getLatest(envelope.documentId)
    const latestParts = latest ? toVersionParts(latest) : null
    const hasApprovedBaseline = Boolean(latestParts && latestParts.major >= 1)
    const next = resolveNextMajorVersion(latestParts, hasApprovedBaseline)
    const versionNumber = next.major
    const versionMinor = next.minor

    const version = await documentRepository.createVersion({
      tenantId: envelope.tenantId,
      documentId: envelope.documentId,
      versionNumber,
      versionMinor,
      changeNotes: 'Signed copy from PandaDoc',
      createdById: envelope.createdById ?? document.createdById,
      sourceType: 'upload',
    })

    const storage = getStorageAdapter()
    const originalName = `${document.trackingNumber}-signed.pdf`
    const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 200)
    const versionSegment = formatVersionLabel(versionNumber, versionMinor).replace('.', '_')
    const storageKey = `tenants/${envelope.tenantId}/documents/${envelope.documentId}/${versionSegment}/${randomUUID()}-${safeName}`
    const checksum = createHash('sha256').update(pdf).digest('hex')

    await storage.upload({
      key: storageKey,
      body: pdf,
      contentType: 'application/pdf',
      metadata: {
        tenantId: envelope.tenantId,
        documentId: envelope.documentId,
        source: 'pandadoc',
        checksum,
      },
    })

    const signedFile = await documentFileRepository.create({
      tenantId: envelope.tenantId,
      documentId: envelope.documentId,
      versionId: version.id,
      fileName: storageKey.split('/').pop()!,
      originalName,
      mimeType: 'application/pdf',
      fileSize: pdf.byteLength,
      s3Key: storageKey,
      s3Bucket: storage.bucket,
      checksum,
      virusScanned: false,
      virusClean: null,
      extractedMetadata: { source: 'pandadoc', pandadocDocumentId: envelope.pandadocDocumentId },
    })

    envelope.status = EsignEnvelopeStatus.COMPLETED
    envelope.completedAt = DateTime.now()
    envelope.signedFileId = signedFile.id
    envelope.versionId = version.id
    await envelope.save()

    if (
      document.status !== DocumentStatus.ARCHIVED &&
      document.status !== DocumentStatus.COMPLETED
    ) {
      // Leave workflow status unchanged; signed artifact is additive.
    }

    await auditService.log({
      tenantId: envelope.tenantId,
      userId: envelope.createdById,
      action: AuditAction.ESIGN_COMPLETED,
      entityType: 'esign_envelope',
      entityId: envelope.id,
      newValues: {
        documentId: envelope.documentId,
        signedFileId: signedFile.id,
        versionId: version.id,
        pandadocDocumentId: envelope.pandadocDocumentId,
      },
    })

    return { ok: true, status: envelope.status, signedFileId: signedFile.id }
  }

  private async readSourceFileForEsign(file: {
    id: string
    originalName: string
    s3Key: string
    mimeType: string
  }): Promise<Buffer> {
    const storage = getStorageAdapter()
    const exists = await storage.exists(file.s3Key)
    if (!exists) {
      throw new EsignValidationException(
        `File "${file.originalName}" is missing from storage. Re-upload it on the latest version (PDF preferred), then try Sign again.`
      )
    }

    try {
      return await storage.read(file.s3Key)
    } catch (error) {
      const name = error instanceof Error ? error.name : ''
      const message = error instanceof Error ? error.message : String(error)
      if (name === 'NoSuchKey' || message.includes('NoSuchKey') || message.includes('does not exist')) {
        throw new EsignValidationException(
          `File "${file.originalName}" is missing from storage. Re-upload it on the latest version (PDF preferred), then try Sign again.`
        )
      }
      throw error
    }
  }

  async serialize(envelope: EsignEnvelope) {
    let signedFile: {
      id: string
      originalName: string
      mimeType: string
      fileSize: number
    } | null = null

    if (envelope.signedFileId) {
      const file = await DocumentFile.query()
        .where('id', envelope.signedFileId)
        .whereNull('deleted_at')
        .first()
      if (file) {
        signedFile = {
          id: file.id,
          originalName: file.originalName,
          mimeType: file.mimeType,
          fileSize: file.fileSize,
        }
      }
    }

    return {
      id: envelope.id,
      documentId: envelope.documentId,
      versionId: envelope.versionId,
      fileId: envelope.fileId,
      pandadocDocumentId: envelope.pandadocDocumentId,
      status: envelope.status,
      recipients: envelope.recipients,
      signedFileId: envelope.signedFileId,
      signedFile,
      errorMessage: envelope.errorMessage,
      sentAt: envelope.sentAt?.toISO() ?? null,
      completedAt: envelope.completedAt?.toISO() ?? null,
      createdAt: envelope.createdAt.toISO(),
    }
  }
}

export const esignService = new EsignService()
