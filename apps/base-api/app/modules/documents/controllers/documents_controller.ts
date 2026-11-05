import type { HttpContext } from '@adonisjs/core/http'
import { documentService } from '#modules/documents/services/document_service'
import { departmentRepository } from '#infrastructure/repositories/department_repository'
import { documentTypeRepository } from '#infrastructure/repositories/document_type_repository'
import { cacheService } from '#infrastructure/cache/redis_cache_service'
import { tenantContext } from '#modules/documents/domain/tenant_context'
import env from '#start/env'
import { DocumentSerializer } from '#presentation/documents/document_serializer'
import { DocumentConfidentialityPolicy } from '#modules/documents/domain/documents/document_confidentiality_policy'
import { DocumentVisibility } from '#modules/documents/domain/enums/index'
import { qrCodeService } from '#modules/documents/services/qr_code_service'
import {
  createDocumentValidator,
  updateDocumentValidator,
  listDocumentsValidator,
  searchDocumentsValidator,
} from '#modules/documents/validators/document'

export default class DocumentsController {
  async index({ request, auth, response }: HttpContext) {
    const filters = await request.validateUsing(listDocumentsValidator, {
      data: request.qs(),
    })

    const documents = await documentService.list(filters, auth.user!.id)
    return response.ok(DocumentSerializer.serializePaginated(documents))
  }

  async search({ request, auth, response }: HttpContext) {
    const { q, ...rest } = await request.validateUsing(searchDocumentsValidator, {
      data: request.qs(),
    })

    const documents = await documentService.search({ ...rest, search: q }, auth.user!.id)
    return response.ok(DocumentSerializer.serializePaginated(documents))
  }

  async show({ params, auth, response }: HttpContext) {
    const document = await documentService.findById(params.id, auth.user!.id)
    await DocumentConfidentialityPolicy.assertCanView(
      document,
      auth.user!,
      tenantContext.requireTenantId()
    )
    // Refresh QR from current PUBLIC_TRACK_BASE_URL / FRONTEND_URL so phone scans stay reachable.
    if (document.visibility === DocumentVisibility.PUBLIC) {
      document.qrCodeUrl = await qrCodeService.generateDataUrl(document.trackingNumber)
      await document.save()
    }
    return response.ok(DocumentSerializer.serializeSummary(document))
  }

  async store({ request, auth, response }: HttpContext) {
    const payload = await request.validateUsing(createDocumentValidator)
    const document = await documentService.create(payload, auth.user!.id)
    return response.created(DocumentSerializer.serializeDetail(document))
  }

  async update({ params, request, auth, response }: HttpContext) {
    const payload = await request.validateUsing(updateDocumentValidator)
    const document = await documentService.update(params.id, payload, auth.user!.id)
    return response.ok(DocumentSerializer.serializeDetail(document))
  }

  async destroy({ params, auth, response }: HttpContext) {
    await documentService.delete(params.id, auth.user!.id)
    return response.ok({ message: 'Document deleted successfully' })
  }

  async archive({ params, auth, response }: HttpContext) {
    const document = await documentService.archive(params.id, auth.user!.id)
    return response.ok({
      message: 'Document archived successfully',
      document: DocumentSerializer.serializeDetail(document),
    })
  }

  async submit({ params, auth, response }: HttpContext) {
    const document = await documentService.submit(params.id, auth.user!.id)
    return response.ok(DocumentSerializer.serializeDetail(document))
  }

  async departments({ response }: HttpContext) {
    const tenantId = tenantContext.requireTenantId()
    const ttl = env.get('CACHE_TTL_LOOKUPS_SECONDS') ?? 900
    const payload = await cacheService.remember(`cache:lookups:departments:${tenantId}`, ttl, async () => {
      const departments = await departmentRepository.listActive()
      return departments.map((d) => ({ id: d.id, name: d.name, code: d.code }))
    })
    return response.ok({ departments: payload })
  }

  async documentTypes({ response }: HttpContext) {
    const tenantId = tenantContext.requireTenantId()
    const ttl = env.get('CACHE_TTL_LOOKUPS_SECONDS') ?? 900
    const payload = await cacheService.remember(`cache:lookups:document-types:${tenantId}`, ttl, async () => {
      const types = await documentTypeRepository.listActive()
      return types.map((t) => ({
        id: t.id,
        name: t.name,
        code: t.code,
        description: t.description,
      }))
    })
    return response.ok({ documentTypes: payload })
  }
}
