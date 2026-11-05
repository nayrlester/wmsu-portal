import type { HttpContext } from '@adonisjs/core/http'
import { documentContentService } from '#modules/documents/services/document_content_service'
import { DocumentSerializer } from '#presentation/documents/document_serializer'
import { saveDocumentContentValidator } from '#modules/documents/validators/document'

export default class DocumentContentController {
  async show({ params, auth, response }: HttpContext) {
    const content = await documentContentService.getContent(params.documentId, auth.user!.id)
    return response.ok(content)
  }

  async update({ params, request, auth, response }: HttpContext) {
    const payload = await request.validateUsing(saveDocumentContentValidator)
    const result = await documentContentService.saveContent(
      params.documentId,
      auth.user!.id,
      payload.contentHtml,
      payload.changeNotes
    )
    return response.ok({
      document: DocumentSerializer.serializeDetail(result.document),
      version: {
        id: result.version.id,
        versionNumber: result.version.versionNumber,
        changeNotes: result.version.changeNotes,
        contentHtml: result.version.contentHtml,
        sourceType: result.version.sourceType,
        createdAt: result.version.createdAt,
      },
    })
  }
}
