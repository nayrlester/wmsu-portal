import { readFile } from 'node:fs/promises'
import type { MultipartFile } from '@adonisjs/core/bodyparser'
import logger from '@adonisjs/core/services/logger'
import Book from '#modules/library/models/book'
import BookDigitalFile from '#modules/library/models/book_digital_file'
import Tenant from '#modules/library/models/tenant'
import User from '#modules/library/models/user'
import { tenantId } from '#modules/library/services/books/book_helpers'
import {
  isLocalDigitalFileId,
  readLocalDigitalFile,
  saveLocalDigitalFile,
} from '#modules/library/services/books/local_digital_file_storage'
import {
  isPlatformDocumentsConfigured,
  PlatformDocumentClient,
} from '#modules/library/services/platform/platform_document_client'

export default class BookDigitalFileService {
  async listForBook(bookId: string) {
    const tid = tenantId()
    await Book.query().where('id', bookId).where('tenant_id', tid).whereNull('deleted_at').firstOrFail()
    return BookDigitalFile.query()
      .where('tenant_id', tid)
      .where('book_id', bookId)
      .orderBy('created_at', 'desc')
  }

  async upload(bookId: string, uploadFile: MultipartFile, userId: string) {
    if (!uploadFile.isValid || !uploadFile.tmpPath) {
      throw new Error(uploadFile.errors?.[0]?.message ?? 'Invalid upload')
    }

    const tid = tenantId()
    const book = await Book.query()
      .where('id', bookId)
      .where('tenant_id', tid)
      .whereNull('deleted_at')
      .firstOrFail()

    const buffer = await readFile(uploadFile.tmpPath)
    const contentType =
      uploadFile.subtype && uploadFile.type
        ? `${uploadFile.type}/${uploadFile.subtype}`
        : uploadFile.type || 'application/octet-stream'

    let platformDocumentId: string | null = null

    if (isPlatformDocumentsConfigured()) {
      try {
        const tenant = await Tenant.findOrFail(tid)
        if (!tenant.platformOrganizationId) {
          logger.warn(
            { tenantId: tid, bookId },
            'Skipping platform digital-file upload: tenant.platform_organization_id is null'
          )
        } else {
          const user = await User.find(userId)
          const platformUserId = user?.platformUserId ?? `library-user:${userId}`
          const client = new PlatformDocumentClient()
          const remote = await client.upload({
            orgId: tenant.platformOrganizationId,
            userId: platformUserId,
            platformPrefix: 'library',
            fileName: uploadFile.clientName,
            contentType,
            body: buffer,
            entityType: 'book',
            entityId: book.id,
          })
          platformDocumentId = remote.id

          return BookDigitalFile.create({
            tenantId: tid,
            bookId: book.id,
            platformDocumentId: remote.id,
            originalName: remote.originalName,
            contentType: remote.contentType,
            sizeBytes: remote.sizeBytes,
            uploadedBy: userId,
          })
        }
      } catch (error) {
        logger.error(
          { err: error, bookId, tenantId: tid },
          'Platform digital-file upload failed; falling back to local storage'
        )
      }
    }

    platformDocumentId = await saveLocalDigitalFile(tid, book.id, buffer)

    return BookDigitalFile.create({
      tenantId: tid,
      bookId: book.id,
      platformDocumentId,
      originalName: uploadFile.clientName,
      contentType,
      sizeBytes: buffer.length,
      uploadedBy: userId,
    })
  }

  async getDownload(
    bookId: string,
    fileId: string,
    userId: string
  ): Promise<
    | { kind: 'url'; url: string; expiresIn?: number; originalName: string; contentType: string | null }
    | { kind: 'binary'; body: ArrayBuffer; contentType: string; originalName: string }
  > {
    const tid = tenantId()
    await Book.query().where('id', bookId).where('tenant_id', tid).whereNull('deleted_at').firstOrFail()

    const file = await BookDigitalFile.query()
      .where('id', fileId)
      .where('book_id', bookId)
      .where('tenant_id', tid)
      .firstOrFail()

    if (isLocalDigitalFileId(file.platformDocumentId)) {
      const buffer = await readLocalDigitalFile(file.platformDocumentId)
      return {
        kind: 'binary',
        body: buffer.buffer.slice(
          buffer.byteOffset,
          buffer.byteOffset + buffer.byteLength
        ) as ArrayBuffer,
        contentType: file.contentType || 'application/octet-stream',
        originalName: file.originalName,
      }
    }

    if (!isPlatformDocumentsConfigured()) {
      throw new Error('PLATFORM_DOCUMENTS_URL and SERVICE_API_KEY must be configured for digital files')
    }

    const tenant = await Tenant.findOrFail(tid)
    if (!tenant.platformOrganizationId) {
      throw new Error('Tenant is not linked to a platform organization (platform_organization_id)')
    }

    const user = await User.find(userId)
    const platformUserId = user?.platformUserId ?? `library-user:${userId}`

    const client = new PlatformDocumentClient()
    const result = await client.getDownload({
      orgId: tenant.platformOrganizationId,
      id: file.platformDocumentId,
      userId: platformUserId,
    })

    if (result.kind === 'json') {
      if (!result.data.url) {
        throw new Error('Document download URL was not returned by the Document Service')
      }
      return {
        kind: 'url',
        url: result.data.url,
        expiresIn: result.data.expiresIn,
        originalName: file.originalName,
        contentType: file.contentType,
      }
    }

    return {
      kind: 'binary',
      body: result.body,
      contentType: result.contentType || file.contentType || 'application/octet-stream',
      originalName: file.originalName,
    }
  }

  serialize(file: BookDigitalFile) {
    return {
      id: file.id,
      bookId: file.bookId,
      platformDocumentId: file.platformDocumentId,
      originalName: file.originalName,
      contentType: file.contentType,
      sizeBytes: file.sizeBytes,
      uploadedBy: file.uploadedBy,
      createdAt: file.createdAt.toISO(),
    }
  }
}
