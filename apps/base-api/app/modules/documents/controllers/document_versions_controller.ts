import type { HttpContext } from '@adonisjs/core/http'
import { formatVersionLabel } from '#modules/documents/domain/documents/document_version_label'
import { documentVersionService } from '#modules/documents/services/document_file_service'
import { createDocumentVersionValidator } from '#modules/documents/validators/document_file'

export default class DocumentVersionsController {
  async index({ params, request, auth, response }: HttpContext) {
    const page = Math.min(Math.max(Number(request.input('page', 1)), 1), 1000)
    const limit = Math.min(Math.max(Number(request.input('limit', 25)), 1), 100)
    const result = await documentVersionService.list(params.documentId, auth.user!.id, page, limit)
    return response.ok(result)
  }

  async store({ params, request, auth, response }: HttpContext) {
    const payload = await request.validateUsing(createDocumentVersionValidator)
    const version = await documentVersionService.create(
      params.documentId,
      auth.user!.id,
      payload.changeNotes
    )

    return response.created({
      id: version.id,
      versionNumber: version.versionNumber,
      versionMinor: version.versionMinor ?? 0,
      label: formatVersionLabel(version.versionNumber, version.versionMinor ?? 0),
      changeNotes: version.changeNotes,
      status: version.status,
      submittedAt: version.submittedAt,
      createdAt: version.createdAt,
    })
  }

  async submit({ params, auth, response }: HttpContext) {
    const result = await documentVersionService.submit(
      params.documentId,
      params.versionId,
      auth.user!.id
    )

    return response.ok({
      document: {
        id: result.document.id,
        status: result.document.status,
        submittedAt: result.document.submittedAt,
      },
      version: {
        id: result.version.id,
        label: formatVersionLabel(result.version.versionNumber, result.version.versionMinor ?? 0),
        status: result.version.status,
        submittedAt: result.version.submittedAt,
      },
    })
  }
}
