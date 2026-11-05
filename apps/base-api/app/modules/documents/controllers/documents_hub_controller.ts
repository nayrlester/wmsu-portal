import { readFile } from 'node:fs/promises'
import type { HttpContext } from '@adonisjs/core/http'
import {
  documentHubService,
  isValidPlatformPrefix,
} from '#modules/documents/services/document_hub_service'

/**
 * M2M enterprise document hub — matches PlatformDocumentClient contract.
 */
export default class DocumentsHubController {
  async store({ request, response }: HttpContext) {
    const orgId = request.header('x-platform-org-id')?.trim()
    const uploadedBy = request.header('x-platform-user-id')?.trim() || 'system'
    if (!orgId) {
      return response.badRequest({ error: 'X-Platform-Org-Id is required' })
    }

    const platformPrefixRaw = String(request.input('platformPrefix') ?? '')
    if (!isValidPlatformPrefix(platformPrefixRaw)) {
      return response.badRequest({ error: 'platformPrefix must be hris | library | doctrack' })
    }

    const file = request.file('file', { size: '100mb' })
    if (!file?.tmpPath) {
      return response.badRequest({ error: 'file is required' })
    }

    const body = await readFile(file.tmpPath)
    const contentType =
      file.type && file.subtype ? `${file.type}/${file.subtype}` : 'application/octet-stream'

    const data = await documentHubService.upload({
      orgId,
      uploadedBy,
      platformPrefix: platformPrefixRaw,
      fileName: file.clientName || 'upload.bin',
      contentType,
      body,
      entityType: (request.input('entityType') as string | undefined) ?? null,
      entityId: (request.input('entityId') as string | undefined) ?? null,
    })

    return response.created({ data })
  }

  async index({ request, response }: HttpContext) {
    const orgId = request.header('x-platform-org-id')?.trim()
    if (!orgId) {
      return response.badRequest({ error: 'X-Platform-Org-Id is required' })
    }

    const prefixRaw = request.input('platformPrefix') as string | undefined
    if (prefixRaw && !isValidPlatformPrefix(prefixRaw)) {
      return response.badRequest({ error: 'platformPrefix must be hris | library | doctrack' })
    }

    const data = await documentHubService.list({
      orgId,
      platformPrefix: prefixRaw && isValidPlatformPrefix(prefixRaw) ? prefixRaw : undefined,
      limit: Number(request.input('limit') ?? 50),
      offset: Number(request.input('offset') ?? 0),
    })

    return response.ok({ data })
  }

  async download({ request, params, response }: HttpContext) {
    const orgId = request.header('x-platform-org-id')?.trim()
    if (!orgId) {
      return response.badRequest({ error: 'X-Platform-Org-Id is required' })
    }

    try {
      const result = await documentHubService.getDownload({ orgId, id: params.id })
      if (result.kind === 'json') {
        return response.ok({ data: result.data })
      }
      return response
        .header('Content-Type', result.contentType || 'application/octet-stream')
        .header(
          'Content-Disposition',
          `attachment; filename="${encodeURIComponent(result.document.originalName)}"`
        )
        .send(result.body)
    } catch (error) {
      return response.notFound({
        error: error instanceof Error ? error.message : 'Document not found',
      })
    }
  }
}
