import type { HttpContext } from '@adonisjs/core/http'
import { documentViewService } from '#modules/documents/services/document_view_service'

export default class DocumentViewsController {
  async store({ params, auth, response }: HttpContext) {
    await documentViewService.logView(params.documentId, auth.user!.id)
    return response.ok({ logged: true })
  }
}
