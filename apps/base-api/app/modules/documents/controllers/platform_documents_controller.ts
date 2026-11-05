import type { HttpContext } from '@adonisjs/core/http'
import { platformDocumentsService } from '#modules/documents/services/platform_documents_service'
import type { PlatformDocumentPrefix } from '#modules/documents/services/platform/platform_document_client'

const PREFIXES = new Set(['hris', 'library', 'doctrack'])

export default class PlatformDocumentsController {
  async index({ request, auth, response }: HttpContext) {
    const user = auth.user!
    const prefixRaw = request.input('platformPrefix') as string | undefined
    const platformPrefix =
      prefixRaw && PREFIXES.has(prefixRaw) ? (prefixRaw as PlatformDocumentPrefix) : undefined
    if (prefixRaw && !platformPrefix) {
      return response.badRequest({
        message: 'platformPrefix must be hris | library | doctrack',
      })
    }

    try {
      const data = await platformDocumentsService.list({
        userId: user.id,
        platformPrefix,
        limit: Number(request.input('limit') ?? 50),
        offset: Number(request.input('offset') ?? 0),
      })
      return response.ok(data)
    } catch (error) {
      return response.badRequest({
        message: error instanceof Error ? error.message : 'Failed to list platform documents',
      })
    }
  }

  async download({ params, auth, response }: HttpContext) {
    const user = auth.user!
    try {
      const result = await platformDocumentsService.download({
        userId: user.id,
        id: params.id,
      })
      if (result.kind === 'json') {
        return response.ok(result.data)
      }
      return response
        .header('Content-Type', result.contentType || 'application/octet-stream')
        .send(Buffer.from(result.body))
    } catch (error) {
      return response.badRequest({
        message: error instanceof Error ? error.message : 'Download failed',
      })
    }
  }
}
